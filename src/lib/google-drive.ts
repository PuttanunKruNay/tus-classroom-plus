import type { StudentRecord } from '@/types/database';

/**
 * แปลงลิงก์ Google Forms ให้ได้ทั้งลิงก์เปิดเต็มจอและลิงก์สำหรับฝัง iframe
 */
export function normalizeGoogleFormUrl(raw: string): { externalUrl: string; embedUrl: string } {
  const url = raw.trim();
  if (!url) return { externalUrl: '', embedUrl: '' };

  if (url.includes('docs.google.com/forms')) {
    const cleanBase = url.split('?')[0].replace(/\/edit$/, '/viewform');
    const embedUrl = cleanBase.includes('/viewform')
      ? `${cleanBase}?embedded=true`
      : url.includes('embedded=true')
        ? url
        : `${url}${url.includes('?') ? '&' : '?'}embedded=true`;
    return { externalUrl: cleanBase.includes('/viewform') ? cleanBase : url, embedUrl };
  }

  // forms.gle short link: เปิดเต็มจอได้ 100% (iframe ของ short link อาจถูก redirect block บนบางเบราว์เซอร์)
  return { externalUrl: url, embedUrl: url };
}

/**
 * แปลงลิงก์ Google Sheets ทุกรูปแบบให้เป็น URL ดาวน์โหลด CSV โดยตรง
 */
export function extractGoogleSheetCsvUrl(raw: string): { csvUrl: string; sheetId: string | null } {
  const url = raw.trim();
  if (!url) return { csvUrl: '', sheetId: null };

  // กรณีเป็นลิงก์ Publish to Web CSV อยู่แล้ว
  if (url.includes('output=csv') || url.includes('format=csv')) {
    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return { csvUrl: url, sheetId: idMatch ? idMatch[1] : null };
  }

  // กรณีเป็นลิงก์ Google Sheets ปกติ: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={GID}
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const sheetId = idMatch[1];
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return {
      csvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`,
      sheetId
    };
  }

  return { csvUrl: url, sheetId: null };
}

/**
 * Parser มาตรฐาน RFC-4180 รองรับภาษาไทย UTF-8, BOM, เครื่องหมายคำพูด และคอมมาในเซลล์
 */
export function parseCsvRows(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r') {
        if (clean[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some(cell => cell.length > 0)) rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field.trim());
        if (row.some(cell => cell.length > 0)) rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some(cell => cell.length > 0)) rows.push(row);
  }
  return rows;
}

export interface SheetFetchResult {
  ok: boolean;
  message?: string;
  headers: string[];
  rows: string[][];
}

export async function fetchGoogleSheetData(sheetUrl: string): Promise<SheetFetchResult> {
  const { csvUrl } = extractGoogleSheetCsvUrl(sheetUrl);
  if (!csvUrl || !/^https?:\/\//i.test(csvUrl)) {
    return { ok: false, message: 'รูปแบบลิงก์ Google Sheets ไม่ถูกต้อง', headers: [], rows: [] };
  }

  try {
    const res = await fetch(csvUrl, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'TUS-Classroom-Plus/2.0'
      }
    });

    if (!res.ok) {
      return {
        ok: false,
        message: `ไม่สามารถเข้าถึง Google Sheets ได้ (HTTP ${res.status}) — กรุณาตั้งค่าแชร์ชีทเป็น "ทุกคนที่มีลิงก์สามารถดูได้ (Viewer)"`,
        headers: [],
        rows: []
      };
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();
    if (ct.includes('text/html') || text.trimStart().toLowerCase().startsWith('<!doctype html') || text.includes('ServiceLogin')) {
      return {
        ok: false,
        message: 'Google Sheets นี้ยังติดสิทธิ์การเข้าถึง กรุณากดปุ่ม "แชร์ (Share)" ใน Google Sheets แล้วเลือก "ทุกคนที่มีลิงก์" → "ผู้มีสิทธิ์อ่าน (Viewer)" ครับ',
        headers: [],
        rows: []
      };
    }

    const allRows = parseCsvRows(text);
    if (allRows.length < 2) {
      return {
        ok: false,
        message: 'พบข้อมูลในชีทน้อยเกินไป (ต้องมีอย่างน้อย 1 แถวหัวตาราง และ 1 แถวข้อมูลนักเรียน)',
        headers: allRows[0] || [],
        rows: []
      };
    }

    // ค้นหาแถวหัวตารางที่แท้จริง (บางชีทมีบรรทัดชื่อโรงเรียน/รายวิชาอยู่แถวบนสุด 1-3 แถว)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, allRows.length - 1); i++) {
      const joined = allRows[i].join(' ').toLowerCase();
      if (
        joined.includes('รหัส') ||
        joined.includes('ชื่อ') ||
        joined.includes('เลขที่') ||
        joined.includes('student') ||
        joined.includes('score') ||
        joined.includes('คะแนน')
      ) {
        headerIdx = i;
        break;
      }
    }

    const headers = allRows[headerIdx].map((h, i) => h || `คอลัมน์ ${i + 1}`);
    const dataRows = allRows.slice(headerIdx + 1);
    return { ok: true, headers, rows: dataRows };
  } catch (err) {
    console.error('[fetchGoogleSheetData]', err);
    return {
      ok: false,
      message: 'เชื่อมต่อ Google Drive ไม่สำเร็จหรือหมดเวลา กรุณาตรวจสอบลิงก์และการเชื่อมต่ออินเทอร์เน็ต',
      headers: [],
      rows: []
    };
  }
}

function normalizeMatchText(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(นาย|นางสาว|น\.ส\.|เด็กชาย|ด\.ช\.|เด็กหญิง|ด\.ญ\.)\s*/i, '')
    .replace(/\s+/g, '')
    .trim();
}

export interface StudentSheetScoreColumn {
  label: string;
  value: string;
}

/**
 * จับคู่แถวคะแนนของนักเรียนคนนี้คนเดียว (ตามรหัสนักเรียน หรือ ชื่อ-นามสกุล)
 */
export function matchStudentRowFromSheet(
  headers: string[],
  rows: string[][],
  student: Pick<StudentRecord, 'studentId' | 'prefix' | 'firstName' | 'lastName'>
): { found: boolean; matchedBy: string; columns: StudentSheetScoreColumn[] } {
  const targetId = String(student.studentId || '').replace(/\D/g, '').trim();
  const targetFullName = normalizeMatchText(`${student.firstName}${student.lastName}`);
  const targetFirst = normalizeMatchText(student.firstName);
  const targetLast = normalizeMatchText(student.lastName);

  let matchedRow: string[] | null = null;
  let matchedBy = '';

  // 1. จับคู่จากรหัสนักเรียนก่อน (แม่นยำ 100%)
  if (targetId) {
    for (const r of rows) {
      if (r.some(cell => cell.replace(/\D/g, '') === targetId)) {
        matchedRow = r;
        matchedBy = `รหัสนักเรียน ${student.studentId}`;
        break;
      }
    }
  }

  // 2. ถ้าในชีทไม่มีรหัสนักเรียน ให้จับคู่จากชื่อ-สกุล
  if (!matchedRow && targetFullName) {
    for (const r of rows) {
      const joinedNorm = normalizeMatchText(r.join(' '));
      const directMatch = r.some(cell => normalizeMatchText(cell) === targetFullName);
      const splitMatch = Boolean(targetFirst && targetLast && joinedNorm.includes(targetFirst) && joinedNorm.includes(targetLast));
      if (directMatch || splitMatch) {
        matchedRow = r;
        matchedBy = `ชื่อ-สกุล (${student.firstName} ${student.lastName})`;
        break;
      }
    }
  }

  if (!matchedRow) {
    return { found: false, matchedBy: '', columns: [] };
  }

  const columns: StudentSheetScoreColumn[] = [];
  for (let i = 0; i < headers.length; i++) {
    const label = headers[i]?.trim();
    const val = (matchedRow[i] ?? '').trim();
    if (!label) continue;
    columns.push({ label, value: val || '-' });
  }

  return { found: true, matchedBy, columns };
}

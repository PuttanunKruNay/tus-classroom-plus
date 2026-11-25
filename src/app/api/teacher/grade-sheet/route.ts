import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchGoogleSheetData } from '@/lib/google-drive';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const classId = String(body.classId || 'ALL').trim();
    const sheetUrl = String(body.sheetUrl || '').trim();
    const action = String(body.action || 'save').trim(); // 'save' | 'test'

    if (action === 'test') {
      if (!sheetUrl) {
        return NextResponse.json({ ok: false, message: 'กรุณาวางลิงก์ Google Sheets ก่อนทดสอบ' }, { status: 400 });
      }
      const fetched = await fetchGoogleSheetData(sheetUrl);
      if (!fetched.ok) {
        return NextResponse.json({ ok: false, message: fetched.message }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        headers: fetched.headers,
        totalRows: fetched.rows.length,
        previewRows: fetched.rows.slice(0, 5)
      });
    }

    // Save link (allow empty string to clear/unlink)
    const now = new Date().toISOString();
    if (classId === 'ALL' || !classId) {
      const pr = await db.getPrContent();
      await db.updatePrContent({
        ...pr,
        defaultGradeSheetUrl: sheetUrl || undefined,
        defaultGradeSheetUpdatedAt: sheetUrl ? now : undefined,
        updatedAt: now
      });
    } else {
      const cls = await db.getClassById(classId);
      if (!cls) {
        return NextResponse.json({ ok: false, message: 'ไม่พบห้องเรียนที่เลือก' }, { status: 404 });
      }
      await db.upsertClass({
        ...cls,
        gradeSheetUrl: sheetUrl || undefined,
        gradeSheetUpdatedAt: sheetUrl ? now : undefined
      });
    }

    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'UPDATE_GRADE_SHEET',
      detail: sheetUrl
        ? `เชื่อมลิงก์ Google Sheets คะแนน (${classId === 'ALL' ? 'รวมทุกห้อง' : classId})`
        : `ยกเลิกลิงก์ Google Sheets คะแนน (${classId === 'ALL' ? 'รวมทุกห้อง' : classId})`
    });

    // ถ้ามีลิงก์ ให้ลองทดสอบดึงข้อมูลกลับมาแจ้งผลทันที
    let preview: { headers: string[]; totalRows: number; warning?: string } | null = null;
    if (sheetUrl) {
      const fetched = await fetchGoogleSheetData(sheetUrl);
      if (fetched.ok) {
        preview = { headers: fetched.headers, totalRows: fetched.rows.length };
      } else {
        preview = { headers: [], totalRows: 0, warning: fetched.message };
      }
    }

    return NextResponse.json({ ok: true, sheetUrl, classId, preview });
  } catch (err) {
    console.error('[POST /api/teacher/grade-sheet]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกลิงก์ Google Sheets ได้' }, { status: 500 });
  }
}

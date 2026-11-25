import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchGoogleSheetData, matchStudentRowFromSheet } from '@/lib/google-drive';

export async function GET() {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const student = await db.getStudentById(auth.user.id);
    if (!student) {
      return NextResponse.json({ ok: false, message: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
    }

    const [cls, pr] = await Promise.all([
      student.classId ? db.getClassById(student.classId) : Promise.resolve(null),
      db.getPrContent()
    ]);

    // ใช้ชีทเฉพาะห้องเรียนก่อน หากไม่มีใช้ชีทรวมของรายวิชา
    const sheetUrl = (cls?.gradeSheetUrl || pr.defaultGradeSheetUrl || '').trim();
    const sheetScope = cls?.gradeSheetUrl ? `ห้อง ${cls.name}` : 'รวมทุกห้อง';

    if (!sheetUrl) {
      return NextResponse.json({
        ok: true,
        connected: false,
        found: false,
        columns: []
      });
    }

    const fetched = await fetchGoogleSheetData(sheetUrl);
    if (!fetched.ok) {
      return NextResponse.json({
        ok: true,
        connected: true,
        found: false,
        errorMessage: fetched.message,
        sheetScope,
        columns: []
      });
    }

    // ความปลอดภัยสูงสุด: กรองและส่งกลับเฉพาะแถวของนักเรียนที่ล็อกอินอยู่คนเดียวเท่านั้น!
    const matched = matchStudentRowFromSheet(fetched.headers, fetched.rows, student);
    return NextResponse.json({
      ok: true,
      connected: true,
      found: matched.found,
      matchedBy: matched.matchedBy,
      sheetScope,
      fetchedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      columns: matched.columns
    });
  } catch (err) {
    console.error('[GET /api/student/sheet-scores]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถดึงคะแนนจาก Google Sheets ได้ในขณะนี้' }, { status: 500 });
  }
}

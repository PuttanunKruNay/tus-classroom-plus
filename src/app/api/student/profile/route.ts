import { NextResponse } from 'next/server';
import { requireRole, setSessionCookie } from '@/lib/auth';
import { db, sanitizeStudent } from '@/lib/db';

export async function PATCH(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const oldStudentId = auth.user.id;

    const result = await db.updateStudentProfile(oldStudentId, {
      newStudentId: body.studentId !== undefined ? String(body.studentId) : undefined,
      prefix: body.prefix !== undefined ? String(body.prefix) : undefined,
      firstName: body.firstName !== undefined ? String(body.firstName) : undefined,
      lastName: body.lastName !== undefined ? String(body.lastName) : undefined,
      number: body.number !== undefined ? Number(body.number) : undefined
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    const st = result.student;
    const fullName = `${st.prefix}${st.firstName} ${st.lastName}`;

    // ออก Session Cookie ใหม่ทันที เพื่อไม่ให้หลุดระบบหากนักเรียนเปลี่ยนรหัสนักเรียนหรือชื่อ
    await setSessionCookie({
      id: st.studentId,
      role: 'student',
      nameTh: fullName,
      classId: st.classId
    });

    await db.addAuditLog({
      actorId: st.studentId,
      actorName: fullName,
      actorRole: 'student',
      action: 'STUDENT_EDIT_OWN_PROFILE',
      detail: result.idChanged
        ? `นักเรียนแก้ไขข้อมูลส่วนตัวและเปลี่ยนรหัส ${oldStudentId} → ${st.studentId} (${fullName})`
        : `นักเรียนแก้ไขข้อมูลส่วนตัว ${st.studentId} (${fullName} เลขที่ ${st.number})`
    });

    return NextResponse.json({
      ok: true,
      student: sanitizeStudent(st),
      idChanged: result.idChanged
    });
  } catch (err) {
    console.error('[PATCH /api/student/profile]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกข้อมูลส่วนตัวได้' }, { status: 500 });
  }
}

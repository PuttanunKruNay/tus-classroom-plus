import { NextResponse } from 'next/server';
import { requireRole, setSessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const classCode = String(body.classCode || '').trim().toUpperCase();
    const replaceCurrent = Boolean(body.replaceCurrent);

    if (!classCode) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกรหัสคลาสเรียน' }, { status: 400 });
    }

    const cls = await db.getClassByCode(classCode);
    if (!cls || cls.archived) {
      return NextResponse.json(
        { ok: false, message: `ไม่พบรหัสคลาส "${classCode}" หรือชั้นเรียนถูกเก็บถาวรแล้ว` },
        { status: 404 }
      );
    }

    if (cls.enrollmentOpen === false) {
      return NextResponse.json(
        { ok: false, message: `ครูผู้สอนปิดรับการเข้าร่วมห้อง ${cls.name} ชั่วคราว กรุณาติดต่อครูผู้สอน` },
        { status: 403 }
      );
    }

    const student = await db.getStudentById(auth.user.id);
    if (!student) {
      return NextResponse.json({ ok: false, message: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
    }

    const updatedCodes = replaceCurrent
      ? [cls.classCode]
      : Array.from(new Set([...(student.classCodes || []), cls.classCode]));

    const updated = {
      ...student,
      classId: replaceCurrent ? cls.id : student.classId || cls.id,
      classCodes: updatedCodes
    };
    await db.upsertStudent(updated);

    await setSessionCookie({
      ...auth.user,
      classId: updated.classId,
      classCodes: updatedCodes
    });

    await db.addAuditLog({
      actorId: student.studentId,
      actorName: auth.user.nameTh,
      actorRole: 'student',
      action: replaceCurrent ? 'CHANGE_CLASS' : 'JOIN_CLASS',
      detail: `${replaceCurrent ? 'เปลี่ยน' : 'เข้าร่วม'}ห้องเรียน ${cls.name} (${cls.classCode})`
    });

    return NextResponse.json({ ok: true, joinedClass: cls });
  } catch (err) {
    console.error('[POST /api/student/join-class]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถเข้าร่วมคลาสเรียนได้' }, { status: 500 });
  }
}

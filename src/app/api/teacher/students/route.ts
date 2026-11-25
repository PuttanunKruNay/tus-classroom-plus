import { NextResponse } from 'next/server';
import { hashPassword, requireRole } from '@/lib/auth';
import { db, sanitizeStudent } from '@/lib/db';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    // รองรับการนำเข้าหลายคนพร้อมกัน (Bulk Import จาก Excel/CSV)
    if (Array.isArray(body.bulkStudents)) {
      const targetClassId = String(body.classId || '').trim();
      const targetCls = targetClassId ? await db.getClassById(targetClassId) : null;
      let addedCount = 0;

      for (const row of body.bulkStudents) {
        const studentId = String(row.studentId || '').trim();
        const firstName = String(row.firstName || '').trim();
        if (!studentId || !firstName) continue;
        const existing = await db.getStudentById(studentId);
        const rawPass = String(row.password || '1234').trim();
        const passwordHash = existing?.passwordHash || (await hashPassword(rawPass));
        const plainPassword = existing?.plainPassword || rawPass;

        await db.upsertStudent({
          studentId,
          passwordHash,
          plainPassword,
          prefix: String(row.prefix || 'นาย').trim(),
          firstName,
          lastName: String(row.lastName || '').trim(),
          number: Number(row.number) || existing?.number || 1,
          classId: targetClassId || existing?.classId || '',
          classCodes: targetCls
            ? Array.from(new Set([...(existing?.classCodes || []), targetCls.classCode]))
            : existing?.classCodes || [],
          attendance: existing?.attendance ?? 100,
          gameXp: existing?.gameXp ?? 0,
          gameBestScore: existing?.gameBestScore ?? 0,
          gamePlays: existing?.gamePlays ?? 0,
          createdAt: existing?.createdAt || new Date().toISOString()
        });
        addedCount++;
      }

      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: 'BULK_IMPORT_STUDENTS',
        detail: `นำเข้ารายชื่อนักเรียน ${addedCount} คน${targetCls ? ` เข้าห้อง ${targetCls.name}` : ''}`
      });

      return NextResponse.json({ ok: true, addedCount });
    }

    // เพิ่มนักเรียนรายบุคคล
    const studentId = String(body.studentId || '').trim();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    if (!studentId || !firstName) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกรหัสนักเรียนและชื่อจริง' }, { status: 400 });
    }

    const classId = String(body.classId || '').trim();
    const cls = classId ? await db.getClassById(classId) : null;
    const existing = await db.getStudentById(studentId);
    const rawPass = body.password ? String(body.password).trim() : '';
    const passwordHash = rawPass
      ? await hashPassword(rawPass)
      : existing?.passwordHash || (await hashPassword('1234'));
    const plainPassword = rawPass || existing?.plainPassword || '1234';

    const record = {
      studentId,
      passwordHash,
      plainPassword,
      prefix: String(body.prefix || existing?.prefix || 'นาย').trim(),
      firstName,
      lastName,
      number: Math.max(1, Number(body.number) || existing?.number || 1),
      classId: classId || existing?.classId || '',
      classCodes: cls
        ? Array.from(new Set([...(existing?.classCodes || []), cls.classCode]))
        : existing?.classCodes || [],
      attendance: existing?.attendance ?? 100,
      gameXp: existing?.gameXp ?? 0,
      gameBestScore: existing?.gameBestScore ?? 0,
      gamePlays: existing?.gamePlays ?? 0,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    await db.upsertStudent(record);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: existing ? 'UPDATE_STUDENT' : 'CREATE_STUDENT',
      detail: `${existing ? 'อัปเดต' : 'เพิ่ม'}นักเรียน ${studentId} (${record.prefix}${firstName} ${lastName})`
    });

    return NextResponse.json({ ok: true, student: sanitizeStudent(record) });
  } catch (err) {
    console.error('[POST /api/teacher/students]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกข้อมูลนักเรียนได้' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const studentId = String(body.studentId || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!studentId || !newPassword) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสนักเรียนและรหัสผ่านใหม่' }, { status: 400 });
    }

    const student = await db.getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ ok: false, message: 'ไม่พบรหัสนักเรียนนี้' }, { status: 404 });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.upsertStudent({ ...student, passwordHash, plainPassword: newPassword });

    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'RESET_STUDENT_PASSWORD',
      detail: `รีเซ็ตรหัสผ่านนักเรียน ${studentId}`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/teacher/students]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถรีเซ็ตรหัสผ่านได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId')?.trim();
    if (!studentId) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสนักเรียน' }, { status: 400 });
    }

    await db.deleteStudent(studentId);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'DELETE_STUDENT',
      detail: `ลบนักเรียนรหัส ${studentId} และประวัติส่งงานที่เกี่ยวข้อง`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/students]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบนักเรียนได้' }, { status: 500 });
  }
}

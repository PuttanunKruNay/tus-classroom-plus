import { NextResponse } from 'next/server';
import { hashPassword, requireRole, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const auth = await requireRole(['student', 'teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const currentPassword = String(body.currentPassword || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { ok: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' },
        { status: 400 }
      );
    }

    if (auth.user.role === 'student') {
      const student = await db.getStudentById(auth.user.id);
      if (!student) {
        return NextResponse.json({ ok: false, message: 'ไม่พบบัญชีนักเรียน' }, { status: 404 });
      }
      const valid = await verifyPassword(currentPassword, student.passwordHash);
      if (!valid) {
        return NextResponse.json({ ok: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 401 });
      }
      const passwordHash = await hashPassword(newPassword);
      await db.upsertStudent({
        ...student,
        passwordHash,
        plainPassword: newPassword
      });
    } else {
      const staff = await db.getStaffByUsername(auth.user.username || auth.user.id);
      if (!staff) {
        return NextResponse.json({ ok: false, message: 'ไม่พบบัญชีผู้ใช้งาน' }, { status: 404 });
      }
      const valid = await verifyPassword(currentPassword, staff.passwordHash);
      if (!valid) {
        return NextResponse.json({ ok: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 401 });
      }
      const passwordHash = await hashPassword(newPassword);
      await db.upsertStaffUser({
        ...staff,
        passwordHash,
        plainPassword: newPassword
      });
    }

    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'CHANGE_PASSWORD',
      detail: `${auth.user.nameTh} (${auth.user.username || auth.user.id}) เปลี่ยนรหัสผ่านด้วยตนเอง`
    });

    return NextResponse.json({ ok: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('[POST /api/auth/change-password]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถเปลี่ยนรหัสผ่านได้ในขณะนี้' }, { status: 500 });
  }
}

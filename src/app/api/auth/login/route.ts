import { NextResponse } from 'next/server';
import { setSessionCookie, verifyPassword } from '@/lib/auth';
import { db, isQuotaExceededError } from '@/lib/db';
import type { SessionUser } from '@/types/database';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const role = String(body.role || 'student');
    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากรอกชื่อผู้ใช้/รหัสนักเรียน และรหัสผ่านให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (role === 'student') {
      const student = await db.getStudentById(identifier);
      if (!student) {
        return NextResponse.json(
          { ok: false, message: 'ไม่พบรหัสนักเรียนนี้ในระบบ' },
          { status: 401 }
        );
      }
      const valid = await verifyPassword(password, student.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { ok: false, message: 'รหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      const sessionUser: SessionUser = {
        id: student.studentId,
        role: 'student',
        studentId: student.studentId,
        nameTh: `${student.prefix}${student.firstName} ${student.lastName}`,
        classId: student.classId,
        classCodes: student.classCodes
      };
      await setSessionCookie(sessionUser);
      await db.addAuditLog({
        actorId: student.studentId,
        actorName: sessionUser.nameTh,
        actorRole: 'student',
        action: 'LOGIN',
        detail: 'นักเรียนเข้าสู่ระบบ'
      });

      return NextResponse.json({ ok: true, user: sessionUser, redirectTo: '/student' });
    }

    // Teacher or Admin login
    const staff = await db.getStaffByUsername(identifier);
    if (!staff) {
      return NextResponse.json(
        { ok: false, message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' },
        { status: 401 }
      );
    }
    if (role === 'admin' && staff.role !== 'admin') {
      return NextResponse.json(
        { ok: false, message: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ (Admin)' },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, staff.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, message: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: staff.id,
      role: staff.role,
      username: staff.username,
      nameTh: staff.nameTh,
      position: staff.position
    };
    await setSessionCookie(sessionUser);
    await db
      .addAuditLog({
        actorId: staff.id,
        actorName: staff.nameTh,
        actorRole: staff.role,
        action: 'LOGIN',
        detail: `${staff.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูผู้สอน'}เข้าสู่ระบบ`
      })
      .catch(() => {});

    const redirectTo = staff.role === 'admin' && role === 'admin' ? '/admin' : '/teacher';
    return NextResponse.json({ ok: true, user: sessionUser, redirectTo });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    if (isQuotaExceededError(err)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'ขณะนี้ฐานข้อมูล Firebase แผนฟรีครบโควตาประจำวันชั่วคราว (รีเซ็ตอัตโนมัติเวลา 15:00 น. หรือครู/แอดมินเปิดแผน Blaze เพื่อให้เข้าใช้งานได้ทันที)'
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}

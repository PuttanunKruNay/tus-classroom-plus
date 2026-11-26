import { NextResponse } from 'next/server';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { db, isQuotaExceededError } from '@/lib/db';
import type { SessionUser, StudentRecord } from '@/types/database';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = String(body.studentId || '').trim();
    const password = String(body.password || '').trim();
    const prefix = String(body.prefix || 'นาย').trim();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const number = Math.max(1, Number(body.number) || 1);
    const classCode = String(body.classCode || '').trim().toUpperCase();

    if (!studentId || !password || !firstName || !lastName) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }
    if (password.length < 4) {
      return NextResponse.json(
        { ok: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' },
        { status: 400 }
      );
    }

    const existing = await db.getStudentById(studentId);
    if (existing) {
      return NextResponse.json(
        { ok: false, message: 'รหัสนักเรียนนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบ' },
        { status: 409 }
      );
    }

    let classId = '';
    const classCodes: string[] = [];
    if (classCode) {
      const matched = await db.getClassByCode(classCode);
      if (!matched) {
        return NextResponse.json(
          { ok: false, message: `ไม่พบรหัสคลาสเรียน "${classCode}" กรุณาตรวจสอบกับครูผู้สอน` },
          { status: 404 }
        );
      }
      classId = matched.id;
      classCodes.push(matched.classCode);
    }

    const passwordHash = await hashPassword(password);
    const newStudent: StudentRecord = {
      studentId,
      passwordHash,
      plainPassword: password,
      prefix,
      firstName,
      lastName,
      number,
      classId,
      classCodes,
      attendance: 100,
      gameXp: 0,
      gameBestScore: 0,
      gamePlays: 0,
      createdAt: new Date().toISOString()
    };

    await db.upsertStudent(newStudent);

    const sessionUser: SessionUser = {
      id: newStudent.studentId,
      role: 'student',
      studentId: newStudent.studentId,
      nameTh: `${prefix}${firstName} ${lastName}`,
      classId,
      classCodes
    };
    await setSessionCookie(sessionUser);
    await db.addAuditLog({
      actorId: studentId,
      actorName: sessionUser.nameTh,
      actorRole: 'student',
      action: 'STUDENT_REGISTER',
      detail: `สมัครสมาชิกนักเรียนใหม่${classId ? ` เข้าห้อง ${classId}` : ''}`
    });

    return NextResponse.json({ ok: true, user: sessionUser, redirectTo: '/student' });
  } catch (err) {
    console.error('[POST /api/auth/register]', err);
    if (isQuotaExceededError(err)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'ขณะนี้ฐานข้อมูล Firebase แผนฟรีครบโควตาประจำวันชั่วคราว (รีเซ็ตอัตโนมัติเวลา 15:00 น. หรือให้ครูเปิดแผน Blaze)'
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, message: 'ไม่สามารถสมัครสมาชิกได้ในขณะนี้' },
      { status: 500 }
    );
  }
}

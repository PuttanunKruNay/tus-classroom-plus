import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTeacherContact, TEACHER_CONTACTS } from '@/lib/teacher-contacts';
import { sendTeacherNotificationEmail } from '@/lib/mailer';
import { generateId, nowThaiString } from '@/lib/utils';
import type { TeacherMessage } from '@/types/database';

export async function GET() {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const all = await db.listTeacherMessages();
    const mine = all.filter(m => m.studentId === auth.user.id);
    return NextResponse.json({
      ok: true,
      teachers: TEACHER_CONTACTS,
      messages: mine
    });
  } catch (err) {
    console.error('[GET /api/student/contact-teacher]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดกล่องข้อความได้' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const teacherKey = String(body.teacherKey || '').trim();
    const subject = String(body.subject || '').trim().slice(0, 140);
    const message = String(body.message || '').trim().slice(0, 1500);

    const teacher = getTeacherContact(teacherKey);
    if (!teacher) {
      return NextResponse.json({ ok: false, message: 'กรุณาเลือกคุณครูที่ต้องการติดต่อ' }, { status: 400 });
    }
    if (!subject || !message) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกหัวข้อและข้อความให้ครบถ้วน' }, { status: 400 });
    }

    const student = await db.getStudentById(auth.user.id);
    const cls = student?.classId ? await db.getClassById(student.classId) : null;
    const studentName = student
      ? `${student.prefix}${student.firstName} ${student.lastName}`
      : auth.user.nameTh;
    const className = cls?.name || student?.classId || 'ยังไม่เข้าคลาส';
    const sentAtThai = nowThaiString();

    // ส่งอีเมลแจ้งเตือนไปยังอีเมลส่วนตัวครูอัตโนมัติ (ถ้าตั้งค่า SMTP/Resend/Webhook ไว้)
    const mailResult = await sendTeacherNotificationEmail({
      toEmail: teacher.email,
      teacherName: teacher.fullName,
      studentId: auth.user.id,
      studentName,
      className,
      subject,
      message,
      sentAtThai
    });

    const item: TeacherMessage = {
      id: generateId('MSG'),
      studentId: auth.user.id,
      studentName,
      classId: student?.classId || '',
      className,
      teacherKey: teacher.key,
      teacherName: teacher.fullName,
      teacherEmail: teacher.email,
      subject,
      message,
      status: 'open',
      emailSent: mailResult.sent,
      emailError: mailResult.error,
      createdAt: new Date().toISOString()
    };

    await db.upsertTeacherMessage(item);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: studentName,
      actorRole: 'student',
      action: 'CONTACT_TEACHER',
      detail: `ส่งข้อความ/แจ้งปัญหาถึง ${teacher.shortName} (${teacher.email}): "${subject}"`
    });

    return NextResponse.json({
      ok: true,
      item,
      emailSent: mailResult.sent,
      emailError: mailResult.error
    });
  } catch (err) {
    console.error('[POST /api/student/contact-teacher]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถส่งข้อความหาครูได้ในขณะนี้' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { nowThaiString } from '@/lib/utils';

export async function GET() {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const messages = await db.listTeacherMessages();
    const openCount = messages.filter(m => m.status === 'open').length;
    return NextResponse.json({ ok: true, messages, openCount });
  } catch (err) {
    console.error('[GET /api/teacher/messages]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดรายงานปัญหาได้' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    const reply = String(body.reply || '').trim().slice(0, 1500);

    if (!id || !reply) {
      return NextResponse.json({ ok: false, message: 'กรุณาพิมพ์ข้อความตอบกลับนักเรียน' }, { status: 400 });
    }

    const existing = await db.getTeacherMessageById(id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: 'ไม่พบข้อความนี้ในระบบ' }, { status: 404 });
    }

    const updated = {
      ...existing,
      status: 'replied' as const,
      teacherReply: reply,
      repliedBy: auth.user.nameTh,
      repliedAt: nowThaiString()
    };

    await db.upsertTeacherMessage(updated);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'REPLY_STUDENT_MESSAGE',
      detail: `ตอบกลับรายงานปัญหาของ ${existing.studentName} (${existing.studentId}): "${existing.subject}"`
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err) {
    console.error('[PATCH /api/teacher/messages]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกคำตอบได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสข้อความ' }, { status: 400 });
    }
    await db.deleteTeacherMessage(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/messages]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบข้อความได้' }, { status: 500 });
  }
}

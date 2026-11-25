import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId, nowThaiString } from '@/lib/utils';

export async function POST(req: Request) {
  const auth = await requireRole(['student', 'teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const postId = String(body.postId || '').trim();
    const text = String(body.text || '').trim();

    if (!postId || !text) {
      return NextResponse.json({ ok: false, message: 'กรุณาพิมพ์ความคิดเห็น' }, { status: 400 });
    }

    const updated = await db.addCommentToAnnouncement(postId, {
      id: generateId('CM'),
      author: auth.user.nameTh,
      authorRole: auth.user.role,
      text,
      time: nowThaiString()
    });

    if (!updated) {
      return NextResponse.json({ ok: false, message: 'ไม่พบประกาศนี้' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post: updated });
  } catch (err) {
    console.error('[POST /api/student/comment]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถเพิ่มความคิดเห็นได้' }, { status: 500 });
  }
}

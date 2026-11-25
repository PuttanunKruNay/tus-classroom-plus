import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId, nowThaiString } from '@/lib/utils';
import type { PublishStatus, StreamAttachment } from '@/types/database';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim() || generateId('POST');
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const pinned = Boolean(body.pinned);
    const classId = String(body.classId || '').trim();
    const targetGroup = String(body.targetGroup || 'นักเรียนทุกคน').trim();
    const publishStatus: PublishStatus =
      body.publishStatus === 'draft' || body.publishStatus === 'scheduled'
        ? body.publishStatus
        : 'published';
    const scheduledAt = publishStatus === 'scheduled' ? String(body.scheduledAt || '').trim() : '';

    if (!title || !content) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกหัวข้อและเนื้อหาประกาศ' }, { status: 400 });
    }
    if (publishStatus === 'scheduled' && !scheduledAt) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุวันและเวลาที่ต้องการตั้งเวลาโพสต์' }, { status: 400 });
    }

    const existing = body.id ? await db.getAnnouncementById(id) : null;
    const attachments: StreamAttachment[] = Array.isArray(body.attachments)
      ? body.attachments
          .filter((a: StreamAttachment) => a?.url && String(a.url).trim())
          .map((a: StreamAttachment) => ({
            type: a.type === 'youtube' || a.type === 'file' ? a.type : 'link',
            label: String(a.label || a.url).trim(),
            url: String(a.url).trim()
          }))
      : existing?.attachments || [];

    const post = {
      id,
      author: existing?.author || auth.user.nameTh,
      role: (existing?.role || (auth.user.role === 'admin' ? 'admin' : 'teacher')) as 'admin' | 'teacher',
      avatar: existing?.avatar || '/assets/logo_phrakiao.png',
      createdAt:
        publishStatus === 'draft'
          ? 'ฉบับร่าง'
          : publishStatus === 'scheduled'
            ? `ตั้งเวลา: ${scheduledAt.replace('T', ' ')}`
            : nowThaiString(),
      pinned,
      title,
      content,
      classId,
      targetGroup,
      attachments,
      publishStatus,
      scheduledAt: scheduledAt || undefined,
      publishedAt: publishStatus === 'published' ? nowThaiString() : existing?.publishedAt,
      comments: existing?.comments || []
    };

    await db.upsertAnnouncement(post);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: existing ? 'UPDATE_ANNOUNCEMENT' : 'CREATE_ANNOUNCEMENT',
      detail: `${existing ? 'แก้ไข' : 'สร้าง'}ประกาศ "${title}" (${publishStatus})`
    });

    return NextResponse.json({ ok: true, post });
  } catch (err) {
    console.error('[POST /api/teacher/announcements]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกประกาศได้' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    const action = String(body.action || 'toggle_pin').trim();
    const post = await db.getAnnouncementById(id);
    if (!post) return NextResponse.json({ ok: false, message: 'ไม่พบประกาศ' }, { status: 404 });

    let updated = { ...post };
    if (action === 'toggle_pin') {
      updated = { ...post, pinned: !post.pinned };
    } else if (action === 'publish') {
      updated = {
        ...post,
        publishStatus: 'published',
        scheduledAt: undefined,
        createdAt: nowThaiString(),
        publishedAt: nowThaiString()
      };
    } else if (action === 'draft') {
      updated = {
        ...post,
        publishStatus: 'draft',
        scheduledAt: undefined,
        createdAt: 'ฉบับร่าง'
      };
    } else if (action === 'schedule') {
      const scheduledAt = String(body.scheduledAt || '').trim();
      if (!scheduledAt) {
        return NextResponse.json({ ok: false, message: 'กรุณาระบุวันและเวลาที่ต้องการตั้งเวลาโพสต์' }, { status: 400 });
      }
      updated = {
        ...post,
        publishStatus: 'scheduled',
        scheduledAt,
        createdAt: `ตั้งเวลา: ${scheduledAt.replace('T', ' ')}`
      };
    } else {
      return NextResponse.json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
    }

    await db.upsertAnnouncement(updated);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: `ANNOUNCEMENT_${action.toUpperCase()}`,
      detail: `จัดการประกาศ "${post.title}" (${action})`
    });

    return NextResponse.json({ ok: true, post: updated });
  } catch (err) {
    console.error('[PATCH /api/teacher/announcements]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถอัปเดตประกาศได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสประกาศ' }, { status: 400 });

    await db.deleteAnnouncement(id);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'DELETE_ANNOUNCEMENT',
      detail: `ลบประกาศรหัส ${id}`
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/announcements]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบประกาศได้' }, { status: 500 });
  }
}

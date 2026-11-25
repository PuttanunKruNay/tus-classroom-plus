import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId, normalizeEmbedUrl, nowThaiString } from '@/lib/utils';
import type { LessonSlide, PublishStatus } from '@/types/database';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim() || generateId('L');
    const chapter = String(body.chapter || '').trim();
    if (!chapter) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกชื่อบทเรียน' }, { status: 400 });
    }

    const existing = await db.getLessonById(id);
    const allLessons = await db.listLessons();
    const slideUrl = String(body.slideUrl || '').trim();

    let slides: LessonSlide[] = existing?.slides || [];
    if (Array.isArray(body.slides)) {
      slides = body.slides
        .filter((s: LessonSlide) => s?.title && (s.embedUrl || s.externalUrl))
        .map((s: LessonSlide, i: number) => ({
          id: s.id || `SL-${id}-${i + 1}`,
          title: String(s.title).trim(),
          summary: String(s.summary || '').trim(),
          embedUrl: normalizeEmbedUrl(s.embedUrl || s.externalUrl),
          externalUrl: String(s.externalUrl || s.embedUrl).trim()
        }));
    } else if (slideUrl) {
      const newSlide: LessonSlide = {
        id: `SL-${id}-${Date.now().toString(36)}`,
        title: String(body.slideTitle || chapter).trim(),
        summary: String(body.description || '').trim(),
        embedUrl: normalizeEmbedUrl(slideUrl),
        externalUrl: slideUrl
      };
      slides = body.appendSlide && existing?.slides?.length ? [...existing.slides, newSlide] : [newSlide];
    }

    const keyPoints = Array.isArray(body.keyPoints)
      ? body.keyPoints.map(String).filter(Boolean)
      : String(body.keyPointsText || '')
          .split(/\r?\n/)
          .map(s => s.trim())
          .filter(Boolean);

    const publishStatus: PublishStatus =
      body.publishStatus === 'draft' || body.publishStatus === 'scheduled'
        ? body.publishStatus
        : 'published';
    const scheduledAt = publishStatus === 'scheduled' ? String(body.scheduledAt || '').trim() : '';
    if (publishStatus === 'scheduled' && !scheduledAt) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุวันและเวลาที่ต้องการตั้งเวลาโพสต์' }, { status: 400 });
    }

    const lesson = {
      id,
      unit: String(body.unit || existing?.unit || 'บทที่ 1 : ระบบทางเทคโนโลยีที่ซับซ้อน (2 ชั่วโมง)').trim(),
      chapter,
      hours: String(body.hours || existing?.hours || '2 ชั่วโมง').trim(),
      description: String(body.description || existing?.description || '').trim(),
      keyPoints: keyPoints.length ? keyPoints : existing?.keyPoints || [],
      slides,
      deckPages: existing?.deckPages || [
        {
          title: chapter,
          badge: String(body.hours || '2 ชั่วโมง'),
          bullets: keyPoints.length ? keyPoints : [String(body.description || 'สรุปเนื้อหาบทเรียน')]
        }
      ],
      order: Number(body.order) || existing?.order || allLessons.length + 1,
      publishStatus,
      scheduledAt: scheduledAt || undefined,
      publishedAt: publishStatus === 'published' ? existing?.publishedAt || nowThaiString() : existing?.publishedAt,
      modelUrl: body.modelUrl !== undefined ? String(body.modelUrl || '').trim() || undefined : existing?.modelUrl,
      posterUrl: body.posterUrl !== undefined ? String(body.posterUrl || '').trim() || undefined : existing?.posterUrl
    };

    await db.upsertLesson(lesson);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: existing ? 'UPDATE_LESSON' : 'CREATE_LESSON',
      detail: `${existing ? 'แก้ไข' : 'เพิ่ม'}บทเรียน "${chapter}" (${publishStatus})`
    });

    return NextResponse.json({ ok: true, lesson });
  } catch (err) {
    console.error('[POST /api/teacher/lessons]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกบทเรียนได้' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim();
    const lesson = await db.getLessonById(id);
    if (!lesson) {
      return NextResponse.json({ ok: false, message: 'ไม่พบบทเรียนนี้' }, { status: 404 });
    }

    let updated = { ...lesson };
    if (action === 'publish') {
      updated = { ...lesson, publishStatus: 'published', scheduledAt: undefined, publishedAt: nowThaiString() };
    } else if (action === 'draft') {
      updated = { ...lesson, publishStatus: 'draft', scheduledAt: undefined };
    } else if (action === 'schedule') {
      const scheduledAt = String(body.scheduledAt || '').trim();
      if (!scheduledAt) {
        return NextResponse.json({ ok: false, message: 'กรุณาเลือกวันและเวลาที่ต้องการตั้งเวลาโพสต์' }, { status: 400 });
      }
      updated = { ...lesson, publishStatus: 'scheduled', scheduledAt };
    } else {
      return NextResponse.json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
    }

    await db.upsertLesson(updated);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: `LESSON_${action.toUpperCase()}`,
      detail: `เปลี่ยนสถานะบทเรียน "${lesson.chapter}" เป็น ${updated.publishStatus}`
    });

    return NextResponse.json({ ok: true, lesson: updated });
  } catch (err) {
    console.error('[PATCH /api/teacher/lessons]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถเปลี่ยนสถานะบทเรียนได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสบทเรียน' }, { status: 400 });

    await db.deleteLesson(id);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'DELETE_LESSON',
      detail: `ลบบทเรียนรหัส ${id}`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/lessons]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบบทเรียนได้' }, { status: 500 });
  }
}

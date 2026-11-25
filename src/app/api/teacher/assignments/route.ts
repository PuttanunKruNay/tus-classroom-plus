import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeGoogleFormUrl } from '@/lib/google-drive';
import { generateId, nowThaiString } from '@/lib/utils';
import type { AssignmentCategory, PublishStatus, QuizQuestion } from '@/types/database';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    if (body.type === 'topic') {
      const topicTitle = String(body.title || '').trim();
      if (!topicTitle) {
        return NextResponse.json({ ok: false, message: 'กรุณากรอกชื่อหัวข้อ' }, { status: 400 });
      }
      const allTopics = await db.listTopics();
      const topic = { id: generateId('TOP'), title: topicTitle, order: allTopics.length + 1 };
      await db.upsertTopic(topic);
      return NextResponse.json({ ok: true, topic });
    }

    const id = String(body.id || '').trim() || generateId('AS');
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกชื่องานหรือแบบทดสอบ' }, { status: 400 });
    }

    const existing = await db.getAssignmentById(id);
    const all = await db.listAssignments();
    const category = (['form', 'line', 'activity', 'question'].includes(body.category)
      ? body.category
      : existing?.category || 'line') as AssignmentCategory;

    const rawFormUrl = String(body.formExternalUrl || '').trim();
    const normalizedForm = rawFormUrl ? normalizeGoogleFormUrl(rawFormUrl) : null;
    const publishStatus: PublishStatus =
      body.publishStatus === 'draft' || body.publishStatus === 'scheduled'
        ? body.publishStatus
        : 'published';
    const scheduledAt = publishStatus === 'scheduled' ? String(body.scheduledAt || '').trim() : '';
    if (publishStatus === 'scheduled' && !scheduledAt) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุวันและเวลาที่ต้องการตั้งเวลาโพสต์' }, { status: 400 });
    }

    const assignment = {
      id,
      code: String(body.code || existing?.code || `TASK-${all.length + 1}`).trim(),
      title,
      category,
      topicUnit: String(body.topicUnit || existing?.topicUnit || 'บทที่ 1 : ระบบทางเทคโนโลยีที่ซับซ้อน (2 ชั่วโมง)').trim(),
      maxScore: Math.max(1, Number(body.maxScore) || existing?.maxScore || 10),
      dueDate: String(body.dueDate || existing?.dueDate || 'ตามกำหนด').trim(),
      description: String(body.description || existing?.description || '').trim(),
      instruction: String(body.instruction || existing?.instruction || '').trim(),
      formExternalUrl: normalizedForm ? normalizedForm.externalUrl : '',
      formEmbedUrl: normalizedForm ? normalizedForm.embedUrl : '',
      order: Number(body.order) || existing?.order || all.length + 1,
      publishStatus,
      scheduledAt: scheduledAt || undefined,
      publishedAt: publishStatus === 'published' ? existing?.publishedAt || nowThaiString() : existing?.publishedAt
    };

    await db.upsertAssignment(assignment);

    if (Array.isArray(body.questions) && body.questions.length > 0) {
      const cleanQuestions: QuizQuestion[] = body.questions
        .filter((q: QuizQuestion) => q?.q && Array.isArray(q.options) && q.options.length >= 2)
        .map((q: QuizQuestion) => ({
          q: String(q.q).trim(),
          options: q.options.map(o => String(o).trim()),
          answer: Number(q.answer) || 0
        }));

      if (cleanQuestions.length > 0) {
        await db.upsertQuiz({
          assignmentId: id,
          questions: cleanQuestions,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: existing ? 'UPDATE_ASSIGNMENT' : 'CREATE_ASSIGNMENT',
      detail: `${existing ? 'แก้ไข' : 'สร้าง'}ชิ้นงาน "${title}" (${publishStatus})`
    });

    return NextResponse.json({ ok: true, assignment });
  } catch (err) {
    console.error('[POST /api/teacher/assignments]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกงานได้' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim();
    const asg = await db.getAssignmentById(id);
    if (!asg) {
      return NextResponse.json({ ok: false, message: 'ไม่พบชิ้นงานนี้' }, { status: 404 });
    }

    let updated = { ...asg };
    if (action === 'publish') {
      updated = { ...asg, publishStatus: 'published', scheduledAt: undefined, publishedAt: nowThaiString() };
    } else if (action === 'draft') {
      updated = { ...asg, publishStatus: 'draft', scheduledAt: undefined };
    } else if (action === 'schedule') {
      const scheduledAt = String(body.scheduledAt || '').trim();
      if (!scheduledAt) {
        return NextResponse.json({ ok: false, message: 'กรุณาระบุวันและเวลาที่ต้องการตั้งเวลาโพสต์' }, { status: 400 });
      }
      updated = { ...asg, publishStatus: 'scheduled', scheduledAt };
    } else {
      return NextResponse.json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
    }

    await db.upsertAssignment(updated);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: `ASSIGNMENT_${action.toUpperCase()}`,
      detail: `เปลี่ยนสถานะชิ้นงาน "${asg.title}" เป็น ${updated.publishStatus}`
    });

    return NextResponse.json({ ok: true, assignment: updated });
  } catch (err) {
    console.error('[PATCH /api/teacher/assignments]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถอัปเดตสถานะงานได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสงาน' }, { status: 400 });

    await db.deleteAssignment(id);
    await db.deleteQuiz(id);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'DELETE_ASSIGNMENT',
      detail: `ลบชิ้นงานรหัส ${id}`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/assignments]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบงานได้' }, { status: 500 });
  }
}

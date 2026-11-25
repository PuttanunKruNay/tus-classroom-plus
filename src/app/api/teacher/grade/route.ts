import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { nowThaiString } from '@/lib/utils';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    // 1. อนุมัติหลายรายการพร้อมกัน (Bulk Approve)
    if (body.action === 'bulk_approve' && Array.isArray(body.items)) {
      const nowStr = nowThaiString();
      const approvedIds: string[] = [];
      for (const item of body.items) {
        const subId = String(item.submissionId || '').trim();
        if (!subId) continue;
        const existing = await db.getSubmissionById(subId);
        if (!existing || existing.deletedAt) continue;
        const asg = await db.getAssignmentById(existing.assignmentId);
        if (!asg) continue;

        const scoreVal =
          item.score === '' || item.score === null || item.score === undefined
            ? asg.maxScore
            : Math.max(0, Math.min(asg.maxScore, Number(item.score)));

        await db.upsertSubmission({
          ...existing,
          previousState: {
            score: existing.score,
            status: existing.status,
            teacherComment: existing.teacherComment,
            gradedBy: existing.gradedBy
          },
          score: scoreVal,
          status: 'graded',
          teacherComment: item.teacherComment !== undefined ? String(item.teacherComment).trim() : existing.teacherComment || 'ดีมาก',
          updatedAt: nowStr,
          gradedBy: auth.user.username || auth.user.id
        });
        approvedIds.push(subId);
      }

      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: 'BULK_APPROVE_LINE',
        detail: `อนุมัติงานส่งใน LINE พร้อมกัน ${approvedIds.length} รายการ`
      });

      return NextResponse.json({ ok: true, approvedIds });
    }

    // 2. อนุมัติหรือบันทึกคะแนนรายรายการ
    const submissionId = String(body.submissionId || '').trim();
    const studentId = String(body.studentId || '').trim();
    const assignmentId = String(body.assignmentId || '').trim();
    const rawScore = body.score;
    const teacherComment = body.teacherComment !== undefined ? String(body.teacherComment).trim() : undefined;

    const existing = submissionId
      ? await db.getSubmissionById(submissionId)
      : studentId && assignmentId
        ? await db.getSubmission(studentId, assignmentId)
        : null;

    const targetStudentId = existing?.studentId || studentId;
    const targetAssignmentId = existing?.assignmentId || assignmentId;
    if (!targetStudentId || !targetAssignmentId) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลนักเรียนหรือชิ้นงานไม่ครบถ้วน' }, { status: 400 });
    }

    const asg = await db.getAssignmentById(targetAssignmentId);
    if (!asg) {
      return NextResponse.json({ ok: false, message: 'ไม่พบชิ้นงานนี้ในระบบ' }, { status: 404 });
    }

    const score =
      rawScore === '' || rawScore === null || rawScore === undefined
        ? null
        : Math.max(0, Math.min(asg.maxScore, Number(rawScore)));

    const nowStr = nowThaiString();
    const id = existing?.id || `${targetStudentId}__${targetAssignmentId}`;

    const updated = {
      id,
      studentId: targetStudentId,
      assignmentId: targetAssignmentId,
      score,
      status: score !== null ? ('graded' as const) : existing?.status || ('not_submitted' as const),
      lineName: existing?.lineName || '',
      note: existing?.note || '',
      proofImage: existing?.proofImage || '',
      teacherComment: teacherComment !== undefined ? teacherComment : existing?.teacherComment || '',
      submittedAt: existing?.submittedAt || nowStr,
      updatedAt: nowStr,
      gradedBy: auth.user.username || auth.user.id,
      deletedAt: null,
      previousState: existing
        ? {
            score: existing.score,
            status: existing.status,
            teacherComment: existing.teacherComment,
            gradedBy: existing.gradedBy
          }
        : null
    };

    await db.upsertSubmission(updated);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'APPROVE_GRADE',
      detail: `อนุมัติ/บันทึกคะแนน ${targetStudentId} งาน ${asg.code} = ${score ?? '-'}/${asg.maxScore}`
    });

    return NextResponse.json({ ok: true, submission: updated });
  } catch (err) {
    console.error('[POST /api/teacher/grade]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกคะแนนได้' }, { status: 500 });
  }
}

// รองรับ Undo ทั้งตอนอนุมัติและตอนลบ ภายใน 5 วินาที
export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const action = String(body.action || '');
    const ids: string[] = Array.isArray(body.ids)
      ? body.ids.map(String)
      : body.id
        ? [String(body.id)]
        : [];

    if (!ids.length) {
      return NextResponse.json({ ok: false, message: 'ไม่พบรหัสรายการที่ต้องการเลิกทำ' }, { status: 400 });
    }

    if (action === 'undo_delete') {
      for (const id of ids) {
        const sub = await db.getSubmissionById(id);
        if (sub) {
          await db.upsertSubmission({ ...sub, deletedAt: null });
        }
      }
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: 'UNDO_DELETE_SUBMISSION',
        detail: `ยกเลิกการลบรายการส่งงาน ${ids.length} รายการ`
      });
      return NextResponse.json({ ok: true, restored: ids.length });
    }

    if (action === 'undo_approve') {
      for (const id of ids) {
        const sub = await db.getSubmissionById(id);
        if (sub && sub.previousState) {
          await db.upsertSubmission({
            ...sub,
            score: sub.previousState.score,
            status: sub.previousState.status,
            teacherComment: sub.previousState.teacherComment || '',
            gradedBy: sub.previousState.gradedBy,
            previousState: null
          });
        }
      }
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: 'UNDO_APPROVE_SUBMISSION',
        detail: `ยกเลิกการอนุมัติรายการส่งงาน ${ids.length} รายการ`
      });
      return NextResponse.json({ ok: true, reverted: ids.length });
    }

    return NextResponse.json({ ok: false, message: 'คำสั่ง Undo ไม่ถูกต้อง' }, { status: 400 });
  } catch (err) {
    console.error('[PATCH /api/teacher/grade]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถยกเลิกคำสั่งได้' }, { status: 500 });
  }
}

// ลบรายการส่งงาน (Soft Delete เพื่อรองรับ Undo ภายใน 5 วินาที + รองรับลบอันเก่าที่ส่งซ้ำในคลิกเดียว)
export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    const idsParam = searchParams.get('ids')?.trim();

    const targetIds = idsParam
      ? idsParam.split(',').map(s => s.trim()).filter(Boolean)
      : id
        ? [id]
        : [];

    if (!targetIds.length) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสรายการที่ต้องการลบ' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const deletedIds: string[] = [];

    for (const targetId of targetIds) {
      const sub = await db.getSubmissionById(targetId);
      if (sub && !sub.deletedAt) {
        await db.upsertSubmission({ ...sub, deletedAt: nowIso });
        deletedIds.push(targetId);
      }
    }

    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'DELETE_LINE_SUBMISSION',
      detail: `ลบหลักฐานส่งงาน LINE จำนวน ${deletedIds.length} รายการ (${deletedIds.join(', ')})`
    });

    return NextResponse.json({ ok: true, deletedIds });
  } catch (err) {
    console.error('[DELETE /api/teacher/grade]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบรายการส่งงานได้' }, { status: 500 });
  }
}

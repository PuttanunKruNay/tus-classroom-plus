import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { nowThaiString } from '@/lib/utils';

const ALLOWED_IMAGE_PREFIXES = [
  'data:image/jpeg;base64,',
  'data:image/jpg;base64,',
  'data:image/png;base64,',
  'data:image/webp;base64,'
];

export async function POST(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const assignmentId = String(body.assignmentId || '').trim();
    const lineName = String(body.lineName || '').trim().slice(0, 80);
    const note = String(body.note || '').trim().slice(0, 300);
    const proofImage = String(body.proofImage || '').trim();

    if (!assignmentId || !lineName || !proofImage) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากรอกชื่อ LINE และแนบภาพหลักฐานการส่งงานให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบชนิดไฟล์ภาพ (ป้องกัน XSS / ไฟล์อันตราย)
    if (!ALLOWED_IMAGE_PREFIXES.some(prefix => proofImage.startsWith(prefix))) {
      return NextResponse.json(
        { ok: false, message: 'รองรับเฉพาะไฟล์ภาพ JPG, PNG หรือ WebP เท่านั้น' },
        { status: 400 }
      );
    }

    // จำกัดขนาดภาพไม่ให้เกินขีดจำกัด Firestore 1MB
    if (proofImage.length > 750_000) {
      return NextResponse.json(
        { ok: false, message: 'ไฟล์ภาพมีขนาดใหญ่เกินไป กรุณาลดขนาดภาพแล้วอัปโหลดใหม่อีกครั้ง' },
        { status: 413 }
      );
    }

    const asg = await db.getAssignmentById(assignmentId);
    if (!asg) {
      return NextResponse.json({ ok: false, message: 'ไม่พบใบงานนี้ในระบบ' }, { status: 404 });
    }

    // ตรวจสอบว่ามีการส่งงานนี้แล้วหรือไม่ เพื่อเก็บบันทึกส่งซ้ำให้ครูตรวจและลบอันเก่าได้
    const existingList = (await db.listSubmissionsByStudent(auth.user.id)).filter(
      s => s.assignmentId === assignmentId && !s.deletedAt
    );

    const isDuplicate = existingList.length > 0;
    const subId = isDuplicate
      ? `${auth.user.id}__${assignmentId}__${Date.now().toString(36).toUpperCase()}`
      : `${auth.user.id}__${assignmentId}`;

    const nowStr = nowThaiString();
    const record = {
      id: subId,
      studentId: auth.user.id,
      assignmentId,
      score: null,
      status: 'pending_review' as const,
      lineName,
      note,
      proofImage,
      teacherComment: '',
      submittedAt: nowStr,
      updatedAt: nowStr,
      deletedAt: null
    };

    await db.upsertSubmission(record);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: 'student',
      action: isDuplicate ? 'LINE_SUBMIT_DUPLICATE' : 'LINE_SUBMIT',
      detail: `${isDuplicate ? 'ส่งซ้ำ' : 'ส่ง'}หลักฐาน LINE ใบงาน ${asg.code} (${lineName})`
    });

    return NextResponse.json({ ok: true, isDuplicate, submission: record });
  } catch (err) {
    console.error('[POST /api/student/line-submit]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถส่งหลักฐานงานได้' }, { status: 500 });
  }
}

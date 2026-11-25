import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { nowThaiString } from '@/lib/utils';

export async function POST(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const assignmentId = String(body.assignmentId || '').trim();
    const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];

    if (!assignmentId) {
      return NextResponse.json({ ok: false, message: 'ไม่พบรหัสแบบทดสอบ' }, { status: 400 });
    }

    const [asg, quiz] = await Promise.all([
      db.getAssignmentById(assignmentId),
      db.getQuizByAssignmentId(assignmentId)
    ]);

    if (!asg || !quiz || !quiz.questions.length) {
      return NextResponse.json({ ok: false, message: 'ไม่พบชุดข้อสอบในฐานข้อมูล' }, { status: 404 });
    }

    // ตรวจข้อสอบบนเซิร์ฟเวอร์ (นักเรียนแก้คะแนนเองไม่ได้!)
    let correctCount = 0;
    const review = quiz.questions.map((q, idx) => {
      const selected = typeof answers[idx] === 'number' ? answers[idx] : -1;
      const isCorrect = selected === q.answer;
      if (isCorrect) correctCount++;
      return {
        index: idx,
        selected,
        correctAnswer: q.answer,
        isCorrect
      };
    });

    const totalQuestions = quiz.questions.length;
    const score = Math.round((correctCount / totalQuestions) * asg.maxScore * 10) / 10;
    const nowStr = nowThaiString();

    const record = {
      id: `${auth.user.id}__${assignmentId}`,
      studentId: auth.user.id,
      assignmentId,
      score,
      status: 'graded' as const,
      quizAnswers: answers,
      submittedAt: nowStr,
      updatedAt: nowStr,
      gradedBy: 'auto-server'
    };

    await db.upsertSubmission(record);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: 'student',
      action: 'QUIZ_SUBMIT',
      detail: `ส่งแบบทดสอบ ${asg.title} ได้ ${score}/${asg.maxScore} คะแนน`
    });

    return NextResponse.json({
      ok: true,
      correctCount,
      totalQuestions,
      score,
      maxScore: asg.maxScore,
      review,
      submission: record
    });
  } catch (err) {
    console.error('[POST /api/student/quiz-submit]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถตรวจข้อสอบได้' }, { status: 500 });
  }
}

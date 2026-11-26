import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db, isQuotaExceededError, sanitizeStudent } from '@/lib/db';
import { calculateGrade, isPublishedVisible, todayBangkokDate } from '@/lib/utils';
import type { StudentQuizQuestion, SubmissionRecord } from '@/types/database';

export async function GET() {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const student = await db.getStudentById(auth.user.id);
    if (!student) {
      return NextResponse.json({ ok: false, message: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
    }

    const [prContent, classes, lessons, assignments, quizzes, mySubmissions, announcements, top5Students] =
      await Promise.all([
        db.getPrContent(),
        db.listClasses(),
        db.listLessons(),
        db.listAssignments(),
        db.listQuizzes(),
        db.listSubmissionsByStudent(student.studentId),
        db.listAnnouncements(),
        db.listTop5Students()
      ]);

    const classMap = new Map(classes.map(c => [c.id, c]));
    const enrolledClasses = classes.filter(
      c => !c.archived && (c.id === student.classId || (student.classCodes || []).includes(c.classCode))
    );
    const hasJoinedClass = enrolledClasses.length > 0;

    // ซ่อนเฉลย (answer) ไม่ให้ส่งไปที่เบราว์เซอร์นักเรียน
    const sanitizedQuizzes: Record<string, StudentQuizQuestion[]> = {};
    for (const q of quizzes) {
      sanitizedQuizzes[q.assignmentId] = (q.questions || []).map(item => ({
        q: item.q,
        options: item.options
      }));
    }

    // เลือกรายการล่าสุดหรือรายการที่ตรวจแล้วต่อ assignmentId
    const subMap: Record<string, SubmissionRecord> = {};
    for (const sub of mySubmissions) {
      const existing = subMap[sub.assignmentId];
      if (
        !existing ||
        sub.status === 'graded' ||
        (existing.status !== 'graded' && sub.updatedAt >= existing.updatedAt)
      ) {
        subMap[sub.assignmentId] = sub;
      }
    }

    let totalScore = 0;
    let totalMax = 0;
    for (const asg of assignments) {
      totalMax += asg.maxScore;
      const sub = subMap[asg.id];
      if (sub && typeof sub.score === 'number') {
        totalScore += sub.score;
      }
    }
    const percent = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : 0;
    const grade = calculateGrade(percent);

    // ซ่อนผู้ที่ XP = 0 ตามข้อกำหนด (ใช้ Top 5 Query + Cache เพื่อลด Firestore reads)
    const leaderboard = top5Students.map((s, idx) => ({
      rank: idx + 1,
      studentId: s.studentId,
      displayName: `${s.prefix}${s.firstName} ${s.lastName}`,
      className: classMap.get(s.classId)?.name || s.classId || '-',
      gameXp: s.gameXp,
      gameBestScore: s.gameBestScore,
      isMe: s.studentId === student.studentId
    }));

    const visibleLessons = lessons.filter(l => isPublishedVisible(l));
    const visibleAssignments = assignments.filter(a => isPublishedVisible(a));

    const visibleAnnouncements = announcements.filter(
      p => (!p.classId || p.classId === student.classId) && isPublishedVisible(p)
    );

    const today = todayBangkokDate();
    const dailyXpUsed = student.dailyXpDate === today ? student.dailyXpEarned || 0 : 0;
    const dailyAiUsed = student.dailyAiDate === today ? student.dailyAiCount || 0 : 0;

    return NextResponse.json({
      ok: true,
      student: sanitizeStudent(student),
      hasJoinedClass,
      enrolledClasses,
      prBanners: prContent.prBanners || [],
      courseOverview: prContent.courseOverview,
      schoolInfo: prContent.schoolInfo,
      lessons: hasJoinedClass ? visibleLessons : [],
      assignments: hasJoinedClass ? visibleAssignments : [],
      quizzes: hasJoinedClass ? sanitizedQuizzes : {},
      submissions: subMap,
      allMySubmissions: mySubmissions,
      gradeSummary: { totalScore, totalMax, percent, grade },
      announcements: hasJoinedClass ? visibleAnnouncements : [],
      leaderboard,
      quotas: {
        dailyXpUsed,
        dailyXpCap: 150,
        dailyAiRemaining: Math.max(0, 20 - dailyAiUsed),
        dailyAiLimit: 20,
        dailyChallengeDone: student.dailyChallengeDate === today
      }
    });
  } catch (err) {
    console.error('[GET /api/student/dashboard]', err);
    if (isQuotaExceededError(err)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'ขณะนี้ฐานข้อมูล Firebase แผนฟรีครบโควตาประจำวันชั่วคราว (รีเซ็ตอัตโนมัติเวลา 15:00 น. — ระบบเพิ่งอัปเกรดแคชลดการใช้งานลง 98% แล้ว รอบถัดไปจะไม่เต็มง่ายอีก)'
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดข้อมูลห้องเรียนได้' }, { status: 500 });
  }
}

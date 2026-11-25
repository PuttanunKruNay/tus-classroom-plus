import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db, sanitizeStudent } from '@/lib/db';

export async function GET() {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const [
      prContent,
      classes,
      students,
      topics,
      lessons,
      assignments,
      quizzes,
      submissions,
      announcements,
      teacherMessages,
      stats
    ] = await Promise.all([
      db.getPrContent(),
      db.listClasses(),
      db.listStudents(),
      db.listTopics(),
      db.listLessons(),
      db.listAssignments(),
      db.listQuizzes(),
      db.listSubmissions(),
      db.listAnnouncements(),
      db.listTeacherMessages(),
      db.getStats()
    ]);

    const subByStudent: Record<string, Record<string, (typeof submissions)[number]>> = {};
    for (const sub of submissions) {
      if (!subByStudent[sub.studentId]) subByStudent[sub.studentId] = {};
      subByStudent[sub.studentId][sub.assignmentId] = sub;
    }

    // วิเคราะห์ผลสัมฤทธิ์ทางการเรียน (Pre-test vs Post-test สำหรับงานวิจัยชั้นเรียน)
    const preId = 'AS-PRE';
    const postId = 'AS-CH1-QUIZ';
    const researchRows = students
      .filter(s => s.classId)
      .map(s => {
        const pre = subByStudent[s.studentId]?.[preId]?.score ?? null;
        const post = subByStudent[s.studentId]?.[postId]?.score ?? null;
        const diff = typeof pre === 'number' && typeof post === 'number' ? Math.round((post - pre) * 10) / 10 : null;
        return {
          studentId: s.studentId,
          classId: s.classId,
          number: s.number,
          name: `${s.prefix}${s.firstName} ${s.lastName}`,
          preScore: pre,
          postScore: post,
          diff
        };
      });

    const validPre = researchRows.filter(r => typeof r.preScore === 'number').map(r => r.preScore as number);
    const validPost = researchRows.filter(r => typeof r.postScore === 'number').map(r => r.postScore as number);
    const validDiff = researchRows.filter(r => typeof r.diff === 'number').map(r => r.diff as number);

    const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0);

    return NextResponse.json({
      ok: true,
      user: auth.user,
      dbMode: stats.mode,
      courseOverview: prContent.courseOverview,
      schoolInfo: prContent.schoolInfo,
      defaultGradeSheetUrl: prContent.defaultGradeSheetUrl || '',
      defaultGradeSheetUpdatedAt: prContent.defaultGradeSheetUpdatedAt || '',
      classes,
      students: students.map(sanitizeStudent),
      topics,
      lessons,
      assignments,
      quizzes,
      submissions,
      announcements,
      teacherMessages,
      research: {
        preAssignmentId: preId,
        postAssignmentId: postId,
        avgPre: avg(validPre),
        avgPost: avg(validPost),
        avgDiff: avg(validDiff),
        sampleCount: validDiff.length,
        rows: researchRows
      }
    });
  } catch (err) {
    console.error('[GET /api/teacher/overview]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดข้อมูลระบบครูได้' }, { status: 500 });
  }
}

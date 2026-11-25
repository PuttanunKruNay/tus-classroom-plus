import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [prContent, students, classes, stats] = await Promise.all([
      db.getPrContent(),
      db.listStudents(),
      db.listClasses(),
      db.getStats()
    ]);

    const classMap = new Map(classes.map(c => [c.id, c.name]));

    // ซ่อนผู้ที่ XP = 0 เพื่อแสดงข้อความชวนเล่นเมื่อยังไม่มีใครเก็บ XP
    const top5Leaderboard = students
      .filter(s => s.classId && (s.gameXp || 0) > 0)
      .sort((a, b) => b.gameXp - a.gameXp || b.gameBestScore - a.gameBestScore)
      .slice(0, 5)
      .map((s, idx) => ({
        rank: idx + 1,
        studentId: s.studentId,
        displayName: `${s.prefix}${s.firstName} ${s.lastName}`,
        className: classMap.get(s.classId) || s.classId || '-',
        gameXp: s.gameXp,
        gameBestScore: s.gameBestScore
      }));

    return NextResponse.json({
      ok: true,
      prContent,
      top5Leaderboard,
      summary: {
        totalClasses: classes.length,
        totalStudents: students.length,
        dbMode: stats.mode
      }
    });
  } catch (err) {
    console.error('[GET /api/public/home]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดข้อมูลหน้าแรกได้' }, { status: 500 });
  }
}

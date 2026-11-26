import { NextResponse } from 'next/server';
import { db, isQuotaExceededError } from '@/lib/db';
import { isFirestoreConfigured } from '@/lib/firebase-admin';
import { buildSeedBundle } from '@/lib/seed-data';

export async function GET() {
  try {
    // ลด Firestore reads ลง >98%: ไม่เรียก db.getStats() และดึงเฉพาะ Top 5 XP + ใส่ CDN Cache 60 วิ
    const [prContent, top5Students, classes] = await Promise.all([
      db.getPrContent(),
      db.listTop5Students(),
      db.listClasses()
    ]);

    const classMap = new Map(classes.map(c => [c.id, c.name]));

    const top5Leaderboard = top5Students.map((s, idx) => ({
      rank: idx + 1,
      studentId: s.studentId,
      displayName: `${s.prefix}${s.firstName} ${s.lastName}`,
      className: classMap.get(s.classId) || s.classId || '-',
      gameXp: s.gameXp,
      gameBestScore: s.gameBestScore
    }));

    return NextResponse.json(
      {
        ok: true,
        prContent,
        top5Leaderboard,
        summary: {
          totalClasses: classes.length,
          dbMode: isFirestoreConfigured() ? 'firestore' : 'local-dev'
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    );
  } catch (err) {
    console.error('[GET /api/public/home]', err);
    // ถ้าโควตา Firestore แผนฟรีเต็มชั่วคราว ให้หน้าแรกยังเปิดดูได้สวยงามด้วยข้อมูลหลักสูตรสำรอง ไม่จอพัง!
    if (isQuotaExceededError(err)) {
      const fallback = await buildSeedBundle();
      return NextResponse.json(
        {
          ok: true,
          quotaLimited: true,
          prContent: fallback.prContent,
          top5Leaderboard: [],
          summary: {
            totalClasses: fallback.classes.length,
            dbMode: 'firestore'
          }
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
          }
        }
      );
    }
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดข้อมูลหน้าแรกได้' }, { status: 500 });
  }
}

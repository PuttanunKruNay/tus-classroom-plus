import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { todayBangkokDate } from '@/lib/utils';

// สูตรแปลงคะแนนและลิมิตฝั่งเซิร์ฟเวอร์ (ห้ามเชื่อค่า XP ที่ส่งมาจากเบราว์เซอร์ตรงๆ)
const DAILY_XP_CAP = 150;
const POINTS_PER_XP = 10;

export async function POST(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const piecesPlaced = Math.max(0, Math.min(400, Math.floor(Number(body.piecesPlaced) || 0)));
    const linesCleared = Math.max(0, Math.min(250, Math.floor(Number(body.linesCleared) || 0)));
    const maxCombo = Math.max(0, Math.min(20, Math.floor(Number(body.maxCombo) || 0)));
    const mode = body.mode === 'daily' ? 'daily' : 'classic';
    const dailyCompleted = Boolean(body.dailyCompleted);

    // ตรวจสอบความสมเหตุสมผล (ป้องกันการปลอมแปลงคะแนน)
    if (piecesPlaced === 0 && linesCleared === 0) {
      return NextResponse.json({ ok: false, message: 'ยังไม่มีคะแนนในรอบนี้' }, { status: 400 });
    }
    if (linesCleared > piecesPlaced * 3) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลเกมไม่สมเหตุสมผล กรุณาเล่นใหม่อีกครั้ง' }, { status: 400 });
    }

    // คำนวณคะแนนฝั่งเซิร์ฟเวอร์: เคลียร์แถว/คอลัมน์ = 10 คะแนนต่อแนว + โบนัสวางบล็อกและคอมโบ
    const lineScore = linesCleared * 10;
    const placeBonus = piecesPlaced * 2;
    const comboBonus = maxCombo > 1 ? (maxCombo - 1) * 15 : 0;
    const verifiedScore = lineScore + placeBonus + comboBonus;

    const student = await db.getStudentById(auth.user.id);
    if (!student) {
      return NextResponse.json({ ok: false, message: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
    }

    const today = todayBangkokDate();
    const alreadyEarnedToday = student.dailyXpDate === today ? student.dailyXpEarned || 0 : 0;
    const remainingDailyCap = Math.max(0, DAILY_XP_CAP - alreadyEarnedToday);

    // สูตรแปลงคะแนนเป็น XP: 1 XP ต่อทุก 10 คะแนน (+20 XP โบนัสถ้าผ่าน Daily Challenge วันนี้ครั้งแรก)
    const rawXp = Math.floor(verifiedScore / POINTS_PER_XP);
    const dailyBonusXp =
      mode === 'daily' && dailyCompleted && student.dailyChallengeDate !== today ? 20 : 0;
    const awardedXp = Math.min(remainingDailyCap, rawXp + dailyBonusXp);

    // คำนวณเหรียญรางวัล (Achievement Badges)
    const badgeSet = new Set<string>(student.badges || []);
    badgeSet.add('first_game');
    if (linesCleared >= 5) badgeSet.add('line_sweeper');
    if (maxCombo >= 3) badgeSet.add('combo_master');
    if (mode === 'daily' && dailyCompleted) badgeSet.add('daily_hero');
    const nextTotalXp = (student.gameXp || 0) + awardedXp;
    if (nextTotalXp >= 500) badgeSet.add('xp_500');

    const updated = {
      ...student,
      gameXp: nextTotalXp,
      gameBestScore: Math.max(student.gameBestScore || 0, verifiedScore),
      gamePlays: (student.gamePlays || 0) + 1,
      dailyXpDate: today,
      dailyXpEarned: alreadyEarnedToday + awardedXp,
      dailyChallengeDate:
        mode === 'daily' && dailyCompleted ? today : student.dailyChallengeDate,
      badges: Array.from(badgeSet)
    };

    await db.upsertStudent(updated);

    return NextResponse.json({
      ok: true,
      verifiedScore,
      awardedXp,
      gameXp: updated.gameXp,
      gameBestScore: updated.gameBestScore,
      gamePlays: updated.gamePlays,
      dailyXpUsed: updated.dailyXpEarned,
      dailyXpCap: DAILY_XP_CAP,
      badges: updated.badges
    });
  } catch (err) {
    console.error('[POST /api/student/game-score]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกคะแนนเกมได้' }, { status: 500 });
  }
}

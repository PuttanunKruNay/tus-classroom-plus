import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const mode = String(body.mode || 'single').trim(); // 'single' | 'class' | 'all'
    const studentId = String(body.studentId || '').trim();
    const classId = String(body.classId || '').trim();

    const allStudents = await db.listStudents();
    let targets = allStudents;

    if (mode === 'single') {
      if (!studentId) {
        return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสนักเรียนที่ต้องการรีเซ็ต XP' }, { status: 400 });
      }
      targets = allStudents.filter(s => s.studentId === studentId);
    } else if (mode === 'class') {
      if (!classId || classId === 'ALL') {
        return NextResponse.json({ ok: false, message: 'กรุณาเลือกห้องเรียนที่ต้องการรีเซ็ต XP' }, { status: 400 });
      }
      targets = allStudents.filter(s => s.classId === classId);
    }

    let resetCount = 0;
    for (const st of targets) {
      await db.upsertStudent({
        ...st,
        gameXp: 0,
        gameBestScore: 0,
        gamePlays: 0,
        dailyXpEarned: 0,
        dailyXpDate: '',
        dailyChallengeDate: ''
      });
      resetCount++;
    }

    const detail =
      mode === 'single'
        ? `รีเซ็ตคะแนน XP ของนักเรียนรหัส ${studentId} เป็น 0`
        : mode === 'class'
          ? `รีเซ็ตคะแนน XP ของห้อง ${classId} จำนวน ${resetCount} คน`
          : `รีเซ็ตคะแนน XP ทั้งหมดทุกห้อง จำนวน ${resetCount} คน (เริ่มอันดับใหม่)`;

    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'RESET_XP',
      detail
    });

    return NextResponse.json({ ok: true, resetCount, message: `${detail} เรียบร้อยแล้ว` });
  } catch (err) {
    console.error('[POST /api/teacher/xp-reset]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถรีเซ็ตคะแนน XP ได้' }, { status: 500 });
  }
}

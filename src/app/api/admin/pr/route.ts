import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: Request) {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const current = await db.getPrContent();

    const updated = {
      ...current,
      ...(body.systemTitle !== undefined ? { systemTitle: String(body.systemTitle).trim() } : {}),
      ...(body.schoolInfo ? { schoolInfo: { ...current.schoolInfo, ...body.schoolInfo } } : {}),
      ...(body.courseOverview ? { courseOverview: { ...current.courseOverview, ...body.courseOverview } } : {}),
      ...(Array.isArray(body.prBanners) ? { prBanners: body.prBanners } : {}),
      ...(Array.isArray(body.prNewsList) ? { prNewsList: body.prNewsList } : {}),
      updatedAt: new Date().toISOString()
    };

    await db.updatePrContent(updated);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: 'admin',
      action: 'UPDATE_PR_CONTENT',
      detail: 'อัปเดตข้อมูลประชาสัมพันธ์หน้าหลัก / รายละเอียดรายวิชา'
    });

    return NextResponse.json({ ok: true, prContent: updated });
  } catch (err) {
    console.error('[PATCH /api/admin/pr]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถอัปเดตข้อมูลประชาสัมพันธ์ได้' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db, seedDatabase } from '@/lib/db';

export async function GET() {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const backup = await db.exportFullBackup();
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: 'admin',
      action: 'EXPORT_BACKUP',
      detail: 'ดาวน์โหลดไฟล์สำรองฐานข้อมูล (JSON Backup)'
    });

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tus-classroom-backup-${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (err) {
    console.error('[GET /api/admin/database]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถสำรองข้อมูลได้' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'seed_merge' || action === 'reset_seed') {
      const clearExisting = action === 'reset_seed';
      const result = await seedDatabase(clearExisting);
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: 'admin',
        action: clearExisting ? 'RESET_DATABASE' : 'SEED_SYNC_DATABASE',
        detail: `${clearExisting ? 'รีเซ็ตฐานข้อมูลเป็นค่าเริ่มต้น' : 'ซิงค์ข้อมูลมาตรฐานเข้าฐานข้อมูล'} (${result.mode})`
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/admin/database]', err);
    return NextResponse.json({ ok: false, message: 'ดำเนินการฐานข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

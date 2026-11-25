import { NextResponse } from 'next/server';
import { hashPassword, requireRole } from '@/lib/auth';
import { db, sanitizeStaff } from '@/lib/db';

export async function POST(req: Request) {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const username = String(body.username || '').trim();
    const nameTh = String(body.nameTh || '').trim();
    const role = body.role === 'admin' ? 'admin' : 'teacher';
    const position = String(body.position || 'ครูผู้สอน').trim();
    const department = String(body.department || 'โรงเรียนเตรียมอุดมศึกษาภาคใต้').trim();
    const password = String(body.password || '').trim();

    if (!username || !nameTh) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอก Username และชื่อ-นามสกุล' }, { status: 400 });
    }

    const existing = await db.getStaffByUsername(username);
    if (!existing && password.length < 4) {
      return NextResponse.json(
        { ok: false, message: 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษรสำหรับบัญชีใหม่' },
        { status: 400 }
      );
    }

    const passwordHash = password ? await hashPassword(password) : existing!.passwordHash;
    const plainPassword = password || existing?.plainPassword;
    const email = body.email !== undefined ? String(body.email).trim() : existing?.email;
    const record = {
      id: existing?.id || username,
      username: existing?.username || username,
      passwordHash,
      plainPassword,
      nameTh,
      role: role as 'admin' | 'teacher',
      position,
      department,
      email,
      avatarUrl: existing?.avatarUrl || '/assets/logo_phrakiao.png?v=3',
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    await db.upsertStaffUser(record);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: 'admin',
      action: existing ? 'UPDATE_STAFF' : 'CREATE_STAFF',
      detail: `${existing ? 'แก้ไข' : 'เพิ่ม'}บัญชี ${username} (${role})`
    });

    return NextResponse.json({ ok: true, staff: sanitizeStaff(record) });
  } catch (err) {
    console.error('[POST /api/admin/users]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถบันทึกบัญชีผู้ใช้ได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ ok: false, message: 'กรุณาระบุ Username' }, { status: 400 });

    if (id === auth.user.id) {
      return NextResponse.json({ ok: false, message: 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้' }, { status: 400 });
    }

    await db.deleteStaffUser(id);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: 'admin',
      action: 'DELETE_STAFF',
      detail: `ลบบัญชีผู้ใช้ ${id}`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/users]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบบัญชีผู้ใช้ได้' }, { status: 500 });
  }
}

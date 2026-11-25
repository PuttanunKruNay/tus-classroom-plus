import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateClassCode } from '@/lib/utils';

export async function POST(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const gradeLevel = String(body.gradeLevel || 'ม.4').trim();
    const roomNo = String(body.roomNo || '1').trim();
    const courseCode = String(body.courseCode || 'ว30184').trim();
    const courseName = String(body.courseName || 'การออกแบบและเทคโนโลยี').trim();

    const gradeNum = gradeLevel.replace(/[^0-9]/g, '') || '4';
    const id = `M${gradeNum}-${roomNo}`;
    const name = `${gradeLevel}/${roomNo}`;

    const existing = await db.getClassById(id);
    if (existing) {
      return NextResponse.json(
        { ok: false, message: `ห้องเรียน ${name} มีอยู่ในระบบแล้ว (รหัส ${existing.classCode})` },
        { status: 409 }
      );
    }

    const customCode = String(body.classCode || '').trim().toUpperCase();
    const classCode = customCode || generateClassCode();

    const newClass = {
      id,
      gradeLevel,
      roomNo,
      name,
      courseCode,
      courseName,
      classCode,
      teacherId: auth.user.id,
      enrollmentOpen: true,
      archived: false,
      createdAt: new Date().toISOString()
    };

    await db.upsertClass(newClass);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'CREATE_CLASS',
      detail: `สร้างห้องเรียน ${name} รหัสคลาส ${classCode}`
    });

    return NextResponse.json({ ok: true, classRoom: newClass });
  } catch (err) {
    console.error('[POST /api/teacher/classes]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถสร้างห้องเรียนได้' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim();
    if (!id) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสห้องเรียน' }, { status: 400 });
    }

    const cls = await db.getClassById(id);
    if (!cls) {
      return NextResponse.json({ ok: false, message: 'ไม่พบห้องเรียนนี้ในระบบ' }, { status: 404 });
    }

    if (action === 'regenerate_code') {
      const nextCode = generateClassCode();
      const updated = { ...cls, classCode: nextCode };
      await db.upsertClass(updated);
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: 'REGENERATE_CLASS_CODE',
        detail: `สุ่มรหัสคลาสใหม่ให้ห้อง ${cls.name}: ${cls.classCode} → ${nextCode}`
      });
      return NextResponse.json({ ok: true, classRoom: updated });
    }

    if (action === 'toggle_enrollment') {
      const nextOpen = cls.enrollmentOpen === false ? true : false;
      const updated = { ...cls, enrollmentOpen: nextOpen };
      await db.upsertClass(updated);
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: 'TOGGLE_CLASS_ENROLLMENT',
        detail: `${nextOpen ? 'เปิด' : 'ปิด'}รับสมัครห้อง ${cls.name} ชั่วคราว`
      });
      return NextResponse.json({ ok: true, classRoom: updated });
    }

    if (action === 'toggle_archive') {
      const nextArchived = !cls.archived;
      const updated = { ...cls, archived: nextArchived };
      await db.upsertClass(updated);
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: auth.user.role,
        action: nextArchived ? 'ARCHIVE_CLASS' : 'UNARCHIVE_CLASS',
        detail: `${nextArchived ? 'เก็บชั้นเรียน' : 'กู้คืนชั้นเรียน'} ${cls.name}`
      });
      return NextResponse.json({ ok: true, classRoom: updated });
    }

    return NextResponse.json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  } catch (err) {
    console.error('[PATCH /api/teacher/classes]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถอัปเดตชั้นเรียนได้' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุรหัสห้องเรียน' }, { status: 400 });
    }

    await db.deleteClass(id);
    await db.addAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.nameTh,
      actorRole: auth.user.role,
      action: 'DELETE_CLASS',
      detail: `ลบห้องเรียนรหัส ${id}`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/classes]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถลบห้องเรียนได้' }, { status: 500 });
  }
}

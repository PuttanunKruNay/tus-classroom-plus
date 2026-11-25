import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db, sanitizeStaffForAdmin, sanitizeStudentForAdmin } from '@/lib/db';

export async function GET() {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const [stats, staffUsers, classes, students, prContent, auditLogs] = await Promise.all([
      db.getStats(),
      db.listStaffUsers(),
      db.listClasses(),
      db.listStudents(),
      db.getPrContent(),
      db.listAuditLogs(80)
    ]);

    return NextResponse.json({
      ok: true,
      user: auth.user,
      stats,
      users: staffUsers.map(sanitizeStaffForAdmin),
      classes,
      students: students.map(sanitizeStudentForAdmin),
      prContent,
      auditLogs
    });
  } catch (err) {
    console.error('[GET /api/admin/overview]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้' }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAdminFirestore, resetFirebaseAdminCache } from '@/lib/firebase-admin';
import { db, resetDbSeedFlag, seedDatabase } from '@/lib/db';

export async function POST(req: Request) {
  const auth = await requireRole(['admin']);
  if (auth.error) return auth.error;

  // อนุญาตให้บันทึกไฟล์กุญแจได้เฉพาะตอนรันบนเครื่อง (Localhost / Dev) เท่านั้น เพื่อความปลอดภัยบน Production
  const host = req.headers.get('host') || '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (!isLocal) {
    return NextResponse.json(
      {
        ok: false,
        message: 'บนเซิร์ฟเวอร์ออนไลน์ กรุณาตั้งค่า FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL และ FIREBASE_PRIVATE_KEY ใน Environment Variables ของโฮสต์โดยตรง'
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const rawJson = String(body.serviceAccountJson || '').trim();
    const geminiKey = body.geminiApiKey !== undefined ? String(body.geminiApiKey).trim() : null;
    const smtpConfig = body.smtpConfig as
      | { host?: string; port?: string | number; user?: string; pass?: string }
      | undefined;

    if (rawJson) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        return NextResponse.json({ ok: false, message: 'รูปแบบ JSON ไม่ถูกต้อง กรุณาวางเนื้อหาไฟล์ Service Account JSON ให้ครบ' }, { status: 400 });
      }

      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        return NextResponse.json(
          { ok: false, message: 'ไฟล์ JSON ขาดข้อมูลสำคัญ (project_id, client_email หรือ private_key)' },
          { status: 400 }
        );
      }

      // บันทึกเป็น serviceAccountKey.json (อยู่ใน .gitignore ปลอดภัยไม่หลุดขึ้น GitHub)
      const keyFilePath = path.join(process.cwd(), 'serviceAccountKey.json');
      fs.writeFileSync(keyFilePath, JSON.stringify(parsed, null, 2), 'utf8');

      // อัปเดต process.env ทันทีและรีเซ็ตแคช Firebase Admin SDK
      process.env.FIREBASE_PROJECT_ID = String(parsed.project_id);
      process.env.FIREBASE_CLIENT_EMAIL = String(parsed.client_email);
      process.env.FIREBASE_PRIVATE_KEY = String(parsed.private_key);
      await resetFirebaseAdminCache();
      resetDbSeedFlag();

      const fsDb = getAdminFirestore();
      if (!fsDb) {
        return NextResponse.json({ ok: false, message: 'เชื่อมต่อ Firebase Admin SDK ไม่สำเร็จ กรุณาตรวจสอบไฟล์กุญแจ' }, { status: 400 });
      }

      // ทดสอบเขียน-อ่านจริงและซิงค์ข้อมูลเข้า Firestore
      const seedRes = await seedDatabase(false);
      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: 'admin',
        action: 'CONNECT_FIRESTORE',
        detail: `เชื่อมต่อ Firebase Firestore (${parsed.project_id}) และซิงค์ข้อมูลสำเร็จ`
      });

      return NextResponse.json({
        ok: true,
        projectId: String(parsed.project_id),
        mode: seedRes.mode,
        counts: seedRes.counts
      });
    }

    if (geminiKey !== null) {
      const envPath = path.join(process.cwd(), '.env.local');
      let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      if (/^GEMINI_API_KEY=/m.test(envText)) {
        envText = envText.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${geminiKey}`);
      } else {
        envText = `${envText.trimEnd()}\nGEMINI_API_KEY=${geminiKey}\n`;
      }
      fs.writeFileSync(envPath, envText, 'utf8');
      process.env.GEMINI_API_KEY = geminiKey;
      return NextResponse.json({ ok: true, geminiConfigured: Boolean(geminiKey) });
    }

    if (smtpConfig) {
      const hostVal = String(smtpConfig.host || 'smtp.gmail.com').trim();
      const portVal = String(smtpConfig.port || '465').trim();
      const userVal = String(smtpConfig.user || '').trim();
      const passVal = String(smtpConfig.pass || '').trim();

      const envPath = path.join(process.cwd(), '.env.local');
      let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      const setEnv = (k: string, v: string) => {
        const re = new RegExp(`^${k}=.*$`, 'm');
        if (re.test(envText)) {
          envText = envText.replace(re, `${k}=${v}`);
        } else {
          envText = `${envText.trimEnd()}\n${k}=${v}\n`;
        }
        process.env[k] = v;
      };
      setEnv('SMTP_HOST', hostVal);
      setEnv('SMTP_PORT', portVal);
      setEnv('SMTP_USER', userVal);
      setEnv('SMTP_PASS', passVal);
      fs.writeFileSync(envPath, envText, 'utf8');

      await db.addAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.nameTh,
        actorRole: 'admin',
        action: 'UPDATE_SMTP_CONFIG',
        detail: userVal ? `ตั้งค่าอีเมลแจ้งเตือนครู (SMTP: ${userVal})` : 'ล้างค่าอีเมลแจ้งเตือน SMTP'
      });

      return NextResponse.json({ ok: true, smtpConfigured: Boolean(userVal && passVal) });
    }

    return NextResponse.json({ ok: false, message: 'ไม่มีข้อมูลที่ต้องการบันทึก' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/admin/firebase-connect]', err);
    return NextResponse.json(
      { ok: false, message: `เชื่อมต่อไม่สำเร็จ: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

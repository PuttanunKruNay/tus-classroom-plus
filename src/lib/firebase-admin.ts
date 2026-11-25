import fs from 'fs';
import path from 'path';
import { cert, deleteApp, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedSource: 'env-vars' | 'env-json' | 'local-file' | null = null;
let lastInitError: string | null = null;

function readServiceAccount(): { sa: ServiceAccount; source: 'env-vars' | 'env-json' | 'local-file' } | null {
  // 1. ไฟล์ serviceAccountKey.json ในโฟลเดอร์โปรเจกต์ (อยู่ใน .gitignore แล้ว)
  const localKeyPath = path.join(process.cwd(), 'serviceAccountKey.json');
  try {
    if (fs.existsSync(localKeyPath)) {
      const parsed = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      if (parsed?.project_id && parsed?.client_email && parsed?.private_key) {
        return {
          sa: {
            projectId: String(parsed.project_id).trim(),
            clientEmail: String(parsed.client_email).trim(),
            privateKey: String(parsed.private_key).replace(/\\n/g, '\n')
          },
          source: 'local-file'
        };
      }
    }
  } catch (err) {
    lastInitError = `อ่านไฟล์ serviceAccountKey.json ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 2. ตัวแปร FIREBASE_SERVICE_ACCOUNT_JSON (เหมาะมากสำหรับ Vercel/Render)
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed?.project_id && parsed?.client_email && parsed?.private_key) {
        return {
          sa: {
            projectId: String(parsed.project_id).trim(),
            clientEmail: String(parsed.client_email).trim(),
            privateKey: String(parsed.private_key).replace(/\\n/g, '\n')
          },
          source: 'env-json'
        };
      }
    } catch (err) {
      lastInitError = `FIREBASE_SERVICE_ACCOUNT_JSON รูปแบบไม่ถูกต้อง: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // 3. ตัวแปรแยก 3 ค่า (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return {
      sa: {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      },
      source: 'env-vars'
    };
  }

  return null;
}

export function isFirestoreConfigured(): boolean {
  return readServiceAccount() !== null;
}

export function getFirebaseInitMeta() {
  return {
    configured: isFirestoreConfigured(),
    source: cachedSource,
    projectId: readServiceAccount()?.sa.projectId || process.env.FIREBASE_PROJECT_ID?.trim() || 'tus-classroom-plus',
    lastError: lastInitError
  };
}

export async function resetFirebaseAdminCache(): Promise<void> {
  cachedDb = null;
  cachedSource = null;
  lastInitError = null;
  if (cachedApp) {
    try {
      await deleteApp(cachedApp);
    } catch {
      // ignore
    }
    cachedApp = null;
  }
}

export function getAdminFirestore(): Firestore | null {
  if (cachedDb) return cachedDb;

  const found = readServiceAccount();
  if (!found) return null;

  try {
    lastInitError = null;
    if (getApps().length > 0) {
      cachedApp = getApps()[0];
    } else {
      cachedApp = initializeApp({
        credential: cert(found.sa)
      });
    }

    cachedDb = getFirestore(cachedApp);
    cachedSource = found.source;
    try {
      cachedDb.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings already applied
    }
    return cachedDb;
  } catch (err) {
    lastInitError = err instanceof Error ? err.message : String(err);
    console.error('[Firebase Admin] Failed to initialize Firestore:', err);
    return null;
  }
}

export function getFirebaseProjectId(): string | null {
  return readServiceAccount()?.sa.projectId || process.env.FIREBASE_PROJECT_ID?.trim() || null;
}

import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { SessionUser, UserRole } from '@/types/database';

export const SESSION_COOKIE_NAME = 'tus_classroom_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET?.trim() ||
    'tus-classroom-dev-fallback-secret-please-set-SESSION_SECRET-in-env';
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    role: user.role,
    nameTh: user.nameTh,
    username: user.username,
    studentId: user.studentId,
    position: user.position,
    classId: user.classId,
    classCodes: user.classCodes
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload?.id || !payload?.role) return null;
    return {
      id: String(payload.id),
      role: payload.role as UserRole,
      nameTh: String(payload.nameTh || ''),
      username: payload.username ? String(payload.username) : undefined,
      studentId: payload.studentId ? String(payload.studentId) : undefined,
      position: payload.position ? String(payload.position) : undefined,
      classId: payload.classId ? String(payload.classId) : undefined,
      classCodes: Array.isArray(payload.classCodes)
        ? payload.classCodes.map(String)
        : undefined
    };
  } catch {
    return null;
  }
}

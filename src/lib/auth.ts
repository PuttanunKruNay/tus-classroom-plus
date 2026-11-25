import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE
} from '@/lib/session';
import type { SessionUser, UserRole } from '@/types/database';

export { SESSION_COOKIE_NAME, createSessionToken, verifySessionToken };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(String(plain), 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(String(plain), hash);
  } catch {
    return false;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return {
      user: null,
      error: NextResponse.json(
        { ok: false, message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' },
        { status: 401 }
      )
    };
  }
  if (!allowedRoles.includes(session.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { ok: false, message: 'บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้' },
        { status: 403 }
      )
    };
  }
  return { user: session, error: null };
}

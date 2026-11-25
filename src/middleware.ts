import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStudentRoute = pathname.startsWith('/student');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isAdminRoute = pathname.startsWith('/admin');

  if (!isStudentRoute && !isTeacherRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('needLogin', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('needLogin', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isStudentRoute && session.role !== 'student') {
    return NextResponse.redirect(new URL(session.role === 'admin' ? '/admin' : '/teacher', request.url));
  }

  if (isTeacherRoute && session.role !== 'teacher' && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/student', request.url));
  }

  if (isAdminRoute && session.role !== 'admin') {
    return NextResponse.redirect(new URL(session.role === 'teacher' ? '/teacher' : '/student', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*']
};

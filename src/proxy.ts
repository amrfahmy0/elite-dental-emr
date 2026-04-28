import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  // Allow access to login and public routes
  if (pathname === '/login' || pathname === '/') {
    if (sessionToken && userRole) {
      // Already logged in, redirect to their dashboard
      if (userRole === 'DOCTOR') return NextResponse.redirect(new URL('/doctor/dashboard', request.url));
      if (userRole === 'RECEPTIONIST') return NextResponse.redirect(new URL('/receptionist/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access control
  if (pathname.startsWith('/doctor') && userRole !== 'DOCTOR') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname.startsWith('/receptionist') && userRole !== 'RECEPTIONIST') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

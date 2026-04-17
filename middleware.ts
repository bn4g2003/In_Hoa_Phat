import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/'];

// Routes that require management portal
const managementRoutes = ['/management'];

// Routes that require operation portal
const operationRoutes = ['/operation'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname === '')) {
    return NextResponse.next();
  }
  
  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }
  
  // Check for session cookie or header
  // Note: Since we're using localStorage on client side, 
  // this middleware provides basic route protection
  // Full auth check happens in layout components
  
  // For protected routes, let the request through
  // Layout components will handle the actual auth check
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

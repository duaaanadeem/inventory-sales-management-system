import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];

// Define routes that staff can access (admin can access everything)
const staffAllowedRoutes = [
  '/dashboard',
  '/products',
  '/pos',
  '/inventory',
  '/purchases',
  '/suppliers',
  '/reports' // Only if they actually have access to reports according to requirements
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static files, api routes, _next paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if the user has an access token or refresh token
  const token = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // 1. Not logged in and trying to access a protected page
  if (!token && !refreshToken && !isPublicRoute) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  // 2. Logged in and trying to access a public auth page or root
  if ((token || refreshToken) && (isPublicRoute || pathname === '/')) {
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }

  // 3. Decode JWT to check role for route protection (if access token is present)
  if (token && !isPublicRoute) {
    try {
      // Basic JWT decoding (header.payload.signature)
      let payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        // Fix Base64Url to Base64
        payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (payloadBase64.length % 4) {
          payloadBase64 += '=';
        }
        
        // atob is available in Edge Runtime
        const payloadStr = atob(payloadBase64);
        const payload = JSON.parse(payloadStr);
        
        if (payload.role === 'staff') {
          // Check if staff is trying to access a disallowed page
          const isAllowed = staffAllowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
          
          if (!isAllowed) {
            const url = new URL('/dashboard', request.url);
            return NextResponse.redirect(url);
          }
        }
      }
    } catch (e) {
      // Ignore decoding errors, let it pass (or could force logout)
    }
  }

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

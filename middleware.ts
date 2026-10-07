import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth/tokens';
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from '@/lib/auth/cookies';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Nếu đã đăng nhập mà truy cập /login hoặc /register thì chuyển về trang chủ
  if (pathname === '/login' || pathname === '/register') {
    const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    if (accessToken) {
      const userPayload = await verifyAccessToken(accessToken);
      if (userPayload) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Chỉ áp dụng cho các route cần bảo vệ
  const isAdminRoute = pathname.startsWith('/admin');
  const isUserProtectedRoute = pathname.startsWith('/profile') || pathname.startsWith('/wallet');

  if (!isAdminRoute && !isUserProtectedRoute) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  const userPayload = accessToken ? await verifyAccessToken(accessToken) : null;

  // 2. KIỂM TRA PHÂN QUYỀN TUYỆT ĐỐI CHO ADMIN ROUTES (/admin/*)
  if (isAdminRoute) {
    // A. Nếu có access token hợp lệ
    if (userPayload) {
      if (userPayload.role !== 'admin') {
        // Tài khoản không phải admin -> LẬP TỨC ĐẨY VỀ TRANG NGƯỜI DÙNG
        const homeUrl = new URL('/', request.url);
        homeUrl.searchParams.set('error', 'unauthorized_admin');
        return NextResponse.redirect(homeUrl);
      }
      return NextResponse.next();
    }

    // B. Nếu access token hết hạn nhưng có refresh token
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        if (refreshPayload.role !== 'admin') {
          // Tài khoản đã đăng nhập nhưng không phải admin -> ĐẨY VỀ TRANG NGƯỜI DÙNG
          const homeUrl = new URL('/', request.url);
          homeUrl.searchParams.set('error', 'unauthorized_admin');
          return NextResponse.redirect(homeUrl);
        }
        // Đúng là admin, cho phép tiếp tục để client refresh
        const response = NextResponse.next();
        response.headers.set('x-auth-refresh-needed', '1');
        return response;
      }
    }

    // C. Chưa đăng nhập -> Chuyển đến trang đăng nhập
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Đối với các route của người dùng thông thường cần đăng nhập (/profile/*, /wallet/*)
  if (!userPayload && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/admin/:path*',
    '/profile/:path*',
    '/wallet/:path*',
  ],
};

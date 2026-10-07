import { NextResponse } from 'next/server';
import {
  verifyOAuthState,
  exchangeGoogleCode,
  findOrCreateGoogleUser,
  getAppUrl,
} from '@/lib/auth/google';
import { setAuthCookies } from '@/lib/auth/cookies';

export const runtime = 'nodejs';

/**
 * GET /api/auth/google/callback
 * Xử lý callback chuyển hướng từ Google sau khi người dùng chấp thuận cấp quyền
 */
export async function GET(request: Request) {
  const appUrl = getAppUrl();

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // 1. Nếu người dùng hủy hoặc Google trả về lỗi
    if (error) {
      console.warn('[Google OAuth Callback] Error from Google:', error);
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
    }

    // 2. Kiểm tra tính hợp lệ của Authorization Code & CSRF State
    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/login?error=missing_code_or_state`);
    }

    const stateData = verifyOAuthState(state);
    if (!stateData) {
      console.warn('[Google OAuth Callback] Invalid or expired CSRF state token');
      return NextResponse.redirect(`${appUrl}/login?error=invalid_csrf_state`);
    }

    const destinationPath = stateData.redirectPath || '/';

    // 3. Đổi Code lấy Profile người dùng từ Google
    const profile = await exchangeGoogleCode(code);

    // 4. Tìm kiếm hoặc tạo mới tài khoản người dùng trong MongoDB
    const userAgent = request.headers.get('user-agent') || undefined;
    const { accessToken, refreshToken } = await findOrCreateGoogleUser(profile, userAgent);

    // 5. Chuyển hướng người dùng về trang đích kèm HttpOnly Cookies
    const redirectTarget = `${appUrl}${destinationPath.startsWith('/') ? destinationPath : `/${destinationPath}`}`;
    const response = NextResponse.redirect(redirectTarget);

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (err: any) {
    console.error('[Google OAuth Callback Error]:', err);

    if (err?.message === 'ACCOUNT_BLOCKED') {
      return NextResponse.redirect(`${appUrl}/login?error=account_blocked`);
    }

    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }
}

import { NextResponse } from 'next/server';
import { getGoogleAuthUrl, getGoogleOAuthConfig, findOrCreateGoogleUser, GoogleProfile } from '@/lib/auth/google';
import { setAuthCookies } from '@/lib/auth/cookies';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/auth/google
 * Khởi tạo phiên đăng nhập Google và chuyển hướng người dùng sang Google Accounts
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const redirectPath = url.searchParams.get('redirect') || '/';

    const config = await getGoogleOAuthConfig();
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tính năng đăng nhập Google chưa được cấu hình Client ID trên hệ thống.',
        },
        { status: 503 }
      );
    }

    const authUrl = await getGoogleAuthUrl(redirectPath);
    if (!authUrl) {
      return NextResponse.json(
        { success: false, message: 'Không thể tạo URL xác thực Google.' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[API Auth Google Redirect Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi khi chuyển hướng tới Google.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/google
 * Xác thực Google ID Token (dành cho Google Identity Services / One-Tap / Popup)
 */
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`google-login:${clientIp}`, 15, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const idToken = body?.credential || body?.idToken || body?.id_token;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Mã xác thực Google (credential token) không hợp lệ.' },
        { status: 400 }
      );
    }

    const config = await getGoogleOAuthConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, message: 'Tính năng đăng nhập Google chưa được cấu hình trên máy chủ.' },
        { status: 503 }
      );
    }

    // Xác thực token qua Google TokenInfo API
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) {
      return NextResponse.json(
        { success: false, message: 'Token xác thực Google không hợp lệ hoặc đã hết hạn.' },
        { status: 401 }
      );
    }

    const tokenInfo = await verifyRes.json();
    if (!tokenInfo || tokenInfo.aud !== config.clientId) {
      return NextResponse.json(
        { success: false, message: 'Token không thuộc về ứng dụng này (Client ID mismatch).' },
        { status: 401 }
      );
    }

    const profile: GoogleProfile = {
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      picture: tokenInfo.picture,
      email_verified: tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true,
    };

    const userAgent = request.headers.get('user-agent') || undefined;
    const { user, accessToken, refreshToken } = await findOrCreateGoogleUser(profile, userAgent);

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập bằng tài khoản Google thành công!',
      user,
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error: any) {
    if (error?.message === 'ACCOUNT_BLOCKED') {
      return NextResponse.json(
        { success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.' },
        { status: 403 }
      );
    }

    console.error('[API Auth Google Direct Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình xác thực Google.' },
      { status: 500 }
    );
  }
}

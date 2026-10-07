import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionsCollection } from '@/lib/db/collections';
import { verifyRefreshToken } from '@/lib/auth/tokens';
import { clearAuthCookies, COOKIE_REFRESH_TOKEN } from '@/lib/auth/cookies';
import { verifyCsrfOrigin } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra CSRF Origin
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu không hợp lệ (CSRF check failed).' },
        { status: 403 }
      );
    }

    // 2. Tìm refresh_token cookie để hủy session trong database
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

    if (rawRefreshToken) {
      try {
        const payload = await verifyRefreshToken(rawRefreshToken);
        if (payload?.familyId) {
          const sessions = await getSessionsCollection();
          await sessions.updateMany(
            { familyId: payload.familyId },
            { $set: { isRevoked: true, revokedAt: new Date() } }
          );
        }
      } catch (err) {
        // Token có thể đã hết hạn hoặc không hợp lệ, tiếp tục xóa cookies
        console.warn('[Logout]: Token verification failed during logout, proceeding to clear cookies:', err);
      }
    }

    // 3. Xóa sạch cookie phía client
    const response = NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công!',
    });

    return clearAuthCookies(response);
  } catch (error) {
    console.error('[API Logout Error]:', error);
    const response = NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng xuất.' },
      { status: 500 }
    );
    return clearAuthCookies(response);
  }
}

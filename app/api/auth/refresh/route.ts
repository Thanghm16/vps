import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getUsersCollection, getSessionsCollection } from '@/lib/db/collections';
import { hashToken } from '@/lib/auth/password';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from '@/lib/auth/tokens';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_REFRESH_TOKEN,
  COOKIE_ACCESS_TOKEN,
  cookieOptionsBase,
} from '@/lib/auth/cookies';
import { serializeSafeUser, verifyCsrfOrigin } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra CSRF Origin
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu không hợp lệ (CSRF check failed).' },
        { status: 403 }
      );
    }

    // 2. Lấy refresh_token từ HttpOnly Cookie
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

    if (!rawRefreshToken) {
      const response = NextResponse.json(
        { success: false, message: 'Không tìm thấy phiên đăng nhập (refresh token).' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    // 3. Giải mã và verify refresh token JWT
    const payload = await verifyRefreshToken(rawRefreshToken);
    if (!payload || !payload.userId || !payload.familyId) {
      const response = NextResponse.json(
        { success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    // 4. Lấy thông tin người dùng
    const users = await getUsersCollection();
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(payload.userId);
    } catch {
      const response = NextResponse.json(
        { success: false, message: 'Dữ liệu phiên không hợp lệ.' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const user = await users.findOne({ _id: userObjectId });
    if (!user || user.status === 'blocked') {
      const response = NextResponse.json(
        { success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa.' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const incomingHash = hashToken(rawRefreshToken);
    const sessions = await getSessionsCollection();

    // 5. Kiểm tra phiên theo familyId và hash hiện tại
    const currentSession = await sessions.findOne({
      familyId: payload.familyId,
      refreshTokenHash: incomingHash,
    });

    if (currentSession) {
      // Nếu session này đã bị revoke từ trước -> Token Reuse Attack!
      if (currentSession.isRevoked) {
        console.warn(`[Security] Phát hiện token reuse trên familyId: ${payload.familyId}. Thu hồi toàn bộ session family.`);
        await sessions.updateMany(
          { familyId: payload.familyId },
          { $set: { isRevoked: true, revokedAt: new Date() } }
        );
        const response = NextResponse.json(
          {
            success: false,
            message: 'Phát hiện token đã bị sử dụng lại trái phép. Phiên đăng nhập đã bị hủy bỏ vì lý do bảo mật.',
          },
          { status: 401 }
        );
        return clearAuthCookies(response);
      }

      // Xoay vòng Refresh Token (Token Rotation)
      const newRefreshToken = await createRefreshToken({
        userId: user._id.toString(),
        familyId: payload.familyId,
        role: user.role,
      });

      const newAccessToken = await createAccessToken({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      });

      const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

      // Cập nhật session với token mới, lưu lại previousTokenHash và cấp grace period 20s cho các request song song
      await sessions.updateOne(
        { _id: currentSession._id },
        {
          $set: {
            refreshTokenHash: hashToken(newRefreshToken),
            previousTokenHash: incomingHash,
            graceUntil: new Date(Date.now() + 20 * 1000),
            expiresAt: newExpiresAt,
            lastUsedAt: new Date(),
          },
        }
      );

      const response = NextResponse.json({
        success: true,
        message: 'Làm mới phiên thành công.',
        user: serializeSafeUser(user),
      });

      return setAuthCookies(response, newAccessToken, newRefreshToken);
    }

    // 6. Nếu không khớp hash hiện tại, kiểm tra xem có phải là request đồng thời trong Grace Period (20s) hay không
    const graceSession = await sessions.findOne({
      familyId: payload.familyId,
      previousTokenHash: incomingHash,
    });

    if (
      graceSession &&
      !graceSession.isRevoked &&
      graceSession.graceUntil &&
      new Date() < new Date(graceSession.graceUntil)
    ) {
      // Request đồng thời hợp lệ: Cấp access token mới mà không thu hồi session
      const newAccessToken = await createAccessToken({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Làm mới phiên thành công (grace period).',
        user: serializeSafeUser(user),
      });

      response.cookies.set({
        name: COOKIE_ACCESS_TOKEN,
        value: newAccessToken,
        maxAge: ACCESS_TOKEN_MAX_AGE,
        ...cookieOptionsBase,
      });

      return response;
    }

    // 7. Token không tìm thấy trong session hợp lệ -> Đã bị thu hồi hoặc bị tấn công giả mạo
    console.warn(`[Security] Token không khớp session đang hoạt động trên familyId: ${payload.familyId}. Thu hồi family.`);
    await sessions.updateMany(
      { familyId: payload.familyId },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );

    const response = NextResponse.json(
      {
        success: false,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã bị chấm dứt. Vui lòng đăng nhập lại.',
      },
      { status: 401 }
    );
    return clearAuthCookies(response);
  } catch (error) {
    console.error('[API Refresh Error]:', error);
    const response = NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình làm mới phiên.' },
      { status: 500 }
    );
    return clearAuthCookies(response);
  }
}

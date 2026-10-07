import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUsersCollection, getSessionsCollection } from '@/lib/db/collections';
import { getCurrentUser, verifyCsrfOrigin } from '@/lib/auth/server';
import { hashPassword, verifyPassword, hashToken, generateRandomToken } from '@/lib/auth/password';
import { createAccessToken, createRefreshToken, REFRESH_TOKEN_MAX_AGE } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. CSRF Origin check
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu không hợp lệ (CSRF check failed).' },
        { status: 403 }
      );
    }

    // 2. Yêu cầu đăng nhập
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để đổi mật khẩu.' },
        { status: 401 }
      );
    }

    // 3. Rate limit: tối đa 5 lần đổi mật khẩu / 15 phút
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`change-pwd:${currentUser.id}:${clientIp}`, 5, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(rateLimit.resetInSeconds / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    // 4. Validate body
    const body = await request.json();
    const { oldPassword, newPassword } = body || {};

    if (!oldPassword || typeof oldPassword !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mật khẩu hiện tại.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' },
        { status: 400 }
      );
    }

    // 5. Kiểm tra mật khẩu cũ (Nếu tài khoản có mật khẩu)
    const users = await getUsersCollection();
    const userDoc = await users.findOne({ _id: new ObjectId(currentUser.id) });

    if (!userDoc) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản không tồn tại.' },
        { status: 404 }
      );
    }

    if (userDoc.passwordHash) {
      const isMatch = await verifyPassword(oldPassword, userDoc.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu hiện tại không chính xác.' },
          { status: 400 }
        );
      }
    }

    // 6. Cập nhật mật khẩu mới
    const newHash = await hashPassword(newPassword);
    const now = new Date();
    await users.updateOne(
      { _id: userDoc._id },
      {
        $set: {
          passwordHash: newHash,
          passwordChangedAt: now,
          updatedAt: now,
        },
      }
    );

    // 7. Thu hồi toàn bộ session cũ để bảo vệ tài khoản
    const sessions = await getSessionsCollection();
    await sessions.updateMany(
      { userId: userDoc._id },
      { $set: { isRevoked: true, revokedAt: now } }
    );

    // 8. Cấp session và cookie mới cho thiết bị hiện tại
    const familyId = generateRandomToken(16);
    const accessToken = await createAccessToken({
      userId: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
    });

    const refreshToken = await createRefreshToken({
      userId: userDoc._id.toString(),
      familyId,
      role: userDoc.role,
    });

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);
    await sessions.insertOne({
      userId: userDoc._id!,
      familyId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      createdAt: now,
      lastUsedAt: now,
      isRevoked: false,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Các thiết bị khác đã được đăng xuất.',
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('[API Change Password Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình đổi mật khẩu.' },
      { status: 500 }
    );
  }
}

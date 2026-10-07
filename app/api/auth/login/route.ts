import { NextResponse } from 'next/server';
import { getUsersCollection, getSessionsCollection } from '@/lib/db/collections';
import { verifyPassword, hashToken, generateRandomToken } from '@/lib/auth/password';
import { createAccessToken, createRefreshToken, REFRESH_TOKEN_MAX_AGE } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { serializeSafeUser, verifyCsrfOrigin } from '@/lib/auth/server';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra CSRF Origin
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu không hợp lệ (CSRF check failed).' },
        { status: 403 }
      );
    }

    // 2. Rate Limiting: tối đa 5 lần đăng nhập sai / IP trong 15 phút
    const clientIp = getClientIp(request);
    const rateLimitKey = `login:${clientIp}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều lượt đăng nhập không thành công. Vui lòng thử lại sau ${Math.ceil(rateLimit.resetInSeconds / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    // 3. Đọc và validate body
    const body = await request.json();
    const { identifier, password } = body || {};

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập email hoặc tên đăng nhập.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mật khẩu.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const users = await getUsersCollection();

    // 4. Tìm kiếm user theo email hoặc username
    const user = await users.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // 5. Kiểm tra trạng thái tài khoản
    if (user.status === 'blocked') {
      return NextResponse.json(
        { success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.' },
        { status: 403 }
      );
    }

    // 6. Kiểm tra mật khẩu (hoặc tài khoản tạo qua Google)
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản này được đăng ký qua Google. Vui lòng chọn "Đăng nhập bằng Google" để tiếp tục.' },
        { status: 400 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // 7. Cập nhật thời gian đăng nhập gần nhất
    await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // 8. Tạo Tokens & Lưu Session
    const userIdStr = user._id.toString();
    const familyId = generateRandomToken(16);

    const accessToken = await createAccessToken({
      userId: userIdStr,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await createRefreshToken({
      userId: userIdStr,
      familyId,
      role: user.role,
    });

    const sessions = await getSessionsCollection();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

    await sessions.insertOne({
      userId: user._id!,
      familyId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isRevoked: false,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 9. Phản hồi và gán HttpOnly Cookies
    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: serializeSafeUser(user),
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('[API Login Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng nhập.' },
      { status: 500 }
    );
  }
}

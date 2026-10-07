import { NextResponse } from 'next/server';
import { getUsersCollection, getSessionsCollection } from '@/lib/db/collections';
import { hashPassword, hashToken, generateRandomToken } from '@/lib/auth/password';
import { createAccessToken, createRefreshToken, REFRESH_TOKEN_MAX_AGE } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { serializeSafeUser, verifyCsrfOrigin } from '@/lib/auth/server';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { UserDocument } from '@/types/auth';

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra CSRF Origin
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu không hợp lệ (CSRF check failed).' },
        { status: 403 }
      );
    }

    // 2. Rate Limiting: tối đa 5 đăng ký / IP trong 15 phút
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`register:${clientIp}`, 5, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều lượt đăng ký. Vui lòng thử lại sau ${Math.ceil(rateLimit.resetInSeconds / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    // 3. Đọc và validate body
    const body = await request.json();
    const { username, email, password } = body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'Tên người dùng phải có ít nhất 3 ký tự.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        { success: false, message: 'Tên người dùng chỉ chứa chữ cái, số và dấu gạch dưới (3-20 ký tự).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email không được để trống.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, message: 'Email không hợp lệ.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự.' },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    // 4. Kiểm tra trùng lặp email hoặc username
    const existingEmail = await users.findOne({ email: cleanEmail });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: 'Email này đã được sử dụng.' },
        { status: 409 }
      );
    }

    const existingUsername = await users.findOne({ username: cleanUsername });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: 'Tên người dùng này đã tồn tại.' },
        { status: 409 }
      );
    }

    // 5. Hash password và tạo tài khoản (Mặc định tất cả tài khoản đăng ký mới là 'user')
    const passwordHash = await hashPassword(password);
    const role = 'user';

    // Tìm mã UserCode lớn nhất hiện có hoặc khởi tạo từ 10001
    const lastUser = await users
      .find({ userCode: { $exists: true } })
      .sort({ userCode: -1 })
      .limit(1)
      .toArray();
    const nextUserCode = lastUser.length > 0 && lastUser[0].userCode ? lastUser[0].userCode + 1 : 10001;

    const newUserDoc: UserDocument = {
      userCode: nextUserCode,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role,
      status: 'active',
      balance: 0,
      avatar: '/user-default.jpg',
      emailVerified: false,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await users.insertOne(newUserDoc);
    const createdUser: UserDocument = { ...newUserDoc, _id: insertResult.insertedId };

    // 6. Tạo Access Token & Refresh Token
    const userIdStr = createdUser._id?.toString() || insertResult.insertedId.toString();
    const familyId = generateRandomToken(16);

    const accessToken = await createAccessToken({
      userId: userIdStr,
      username: createdUser.username,
      email: createdUser.email,
      role: createdUser.role,
    });

    const refreshToken = await createRefreshToken({
      userId: userIdStr,
      familyId,
      role: createdUser.role,
    });

    // 7. Lưu session vào MongoDB với refreshTokenHash
    const sessions = await getSessionsCollection();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

    await sessions.insertOne({
      userId: insertResult.insertedId,
      familyId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isRevoked: false,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 8. Đặt HttpOnly cookies và trả về response
    const response = NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user: serializeSafeUser(createdUser),
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('[API Register Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng ký.' },
      { status: 500 }
    );
  }
}

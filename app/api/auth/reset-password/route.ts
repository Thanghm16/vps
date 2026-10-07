import { NextResponse } from 'next/server';
import { getUsersCollection, getPasswordResetsCollection, getSessionsCollection } from '@/lib/db/collections';
import { hashPassword, hashToken } from '@/lib/auth/password';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
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

    // 2. Rate limiting: 5 lần thử / 15 phút
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`reset-pwd:${clientIp}`, 5, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(rateLimit.resetInSeconds / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    // 3. Đọc và validate body
    const body = await request.json();
    const { token, newPassword } = body || {};

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Mã xác thực không hợp lệ.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' },
        { status: 400 }
      );
    }

    // 4. Tìm kiếm token reset trong database
    const tokenHash = hashToken(token);
    const passwordResets = await getPasswordResetsCollection();

    const resetDoc = await passwordResets.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetDoc) {
      return NextResponse.json(
        { success: false, message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' },
        { status: 400 }
      );
    }

    // 5. Đánh dấu token đã sử dụng ngay lập tức (chống replay)
    await passwordResets.updateOne({ _id: resetDoc._id }, { $set: { used: true } });

    // 6. Cập nhật mật khẩu mới cho user
    const users = await getUsersCollection();
    const newHash = await hashPassword(newPassword);
    const now = new Date();

    const updateResult = await users.updateOne(
      { _id: resetDoc.userId },
      {
        $set: {
          passwordHash: newHash,
          passwordChangedAt: now,
          updatedAt: now,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản không tồn tại.' },
        { status: 404 }
      );
    }

    // 7. Thu hồi toàn bộ phiên đăng nhập cũ trên mọi thiết bị
    const sessions = await getSessionsCollection();
    await sessions.updateMany(
      { userId: resetDoc.userId },
      { $set: { isRevoked: true, revokedAt: now } }
    );

    // 8. Trả về thành công và xóa cookies hiện có
    const response = NextResponse.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.',
    });

    return clearAuthCookies(response);
  } catch (error) {
    console.error('[API Reset Password Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình đặt lại mật khẩu.' },
      { status: 500 }
    );
  }
}

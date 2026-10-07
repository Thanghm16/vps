import { NextResponse } from 'next/server';
import { getUsersCollection, getPasswordResetsCollection } from '@/lib/db/collections';
import { generateRandomToken, hashToken } from '@/lib/auth/password';
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

    // 2. Rate Limiting: tối đa 3 yêu cầu / 15 phút trên mỗi IP
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`forgot-pwd:${clientIp}`, 3, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau ${Math.ceil(rateLimit.resetInSeconds / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    // 3. Đọc email từ body
    const body = await request.json();
    const { email } = body || {};

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 4. Tìm kiếm người dùng
    const users = await getUsersCollection();
    const user = await users.findOne({ email: cleanEmail });

    // Anti-user enumeration: Luôn trả về phản hồi thành công giống nhau kể cả khi email không tồn tại
    if (!user || user.status === 'blocked') {
      return NextResponse.json({
        success: true,
        message: 'Nếu địa chỉ email tồn tại trên hệ thống, liên kết khôi phục mật khẩu đã được khởi tạo.',
      });
    }

    // 5. Vô hiệu hóa các token khôi phục cũ chưa dùng của user này
    const passwordResets = await getPasswordResetsCollection();
    await passwordResets.updateMany(
      { userId: user._id, used: false },
      { $set: { used: true } }
    );

    // 6. Tạo raw token ngẫu nhiên và lưu hash vào database
    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await passwordResets.insertOne({
      userId: user._id!,
      email: cleanEmail,
      tokenHash,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // 7. Tạo link reset mật khẩu (Gửi email nếu cấu hình SMTP trong tương lai)
    // KHÔNG log raw token ra console hoặc server log để bảo vệ an toàn thông tin
    return NextResponse.json({
      success: true,
      message: 'Nếu địa chỉ email tồn tại trên hệ thống, liên kết khôi phục mật khẩu đã được gửi.',
    });
  } catch (error) {
    console.error('[API Forgot Password Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ trong quá trình xử lý.' },
      { status: 500 }
    );
  }
}

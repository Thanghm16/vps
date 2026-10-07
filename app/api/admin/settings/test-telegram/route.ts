import { NextResponse } from 'next/server';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { sendTestTelegramNotification } from '@/lib/telegram/bot';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const { botToken, chatId, siteName } = body;

    const result = await sendTestTelegramNotification(botToken, chatId, siteName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Đã gửi tin nhắn kiểm tra thành công vào Telegram của bạn!',
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: result.error || 'Gửi tin nhắn Telegram thất bại.',
      },
      { status: 400 }
    );
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin Test Telegram Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi kiểm tra kết nối Telegram: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

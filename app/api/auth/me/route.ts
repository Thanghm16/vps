import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[API Me Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi máy chủ.' },
      { status: 500 }
    );
  }
}

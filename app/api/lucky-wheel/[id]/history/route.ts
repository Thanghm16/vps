import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import { getActiveWheel, getRecentWinners, getUserSpins } from '@/lib/lucky-wheel/wheel-db';

export const runtime = 'nodejs';

/**
 * GET /api/lucky-wheel/[id]/history
 * Lấy danh sách trúng thưởng công khai mới nhất và lịch sử quay của user hiện tại
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Mã vòng quay không hợp lệ.' },
        { status: 400 }
      );
    }

    const wheel = await getActiveWheel(id);
    if (!wheel || !wheel._id) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy vòng quay may mắn.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));

    // 1. Lấy danh sách người trúng thưởng mới nhất (Public Feed)
    const recentWinners = await getRecentWinners(wheel._id, 20);

    // 2. Lấy lịch sử quay của user hiện tại (nếu đã đăng nhập)
    const user = await getCurrentUser();
    let userHistory: {
      items: any[];
      total: number;
      page: number;
      totalPages: number;
    } = { items: [], total: 0, page: 1, totalPages: 0 };

    if (user) {
      userHistory = await getUserSpins(wheel._id, new ObjectId(user.id), page, limit);
    }

    return NextResponse.json({
      success: true,
      recentWinners,
      userHistory,
    });
  } catch (error) {
    console.error('[API /api/lucky-wheel/[id]/history GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp lịch sử quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import { getActiveWheel, getUserWheelStat, sanitizeWheelForClient } from '@/lib/lucky-wheel/wheel-db';

export const runtime = 'nodejs';

/**
 * GET /api/lucky-wheel/[id]
 * Lấy chi tiết vòng quay (theo slug hoặc id) kèm số lượt quay của user hiện tại
 */
export async function GET(
  _request: Request,
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
    if (!wheel) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy vòng quay may mắn hoặc vòng quay đã tạm đóng.' },
        { status: 404 }
      );
    }

    // Kiểm tra user hiện tại
    const user = await getCurrentUser();
    let userStat = null;
    if (user && wheel._id) {
      userStat = await getUserWheelStat(wheel._id, new ObjectId(user.id));
    }

    const clientData = sanitizeWheelForClient(wheel, userStat);

    return NextResponse.json({
      success: true,
      wheel: clientData,
      user: user
        ? {
            id: user.id,
            username: user.username,
            balance: user.balance,
          }
        : null,
    });
  } catch (error) {
    console.error('[API /api/lucky-wheel/[id] GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp thông tin vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

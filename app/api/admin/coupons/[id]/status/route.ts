import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getCouponsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Bật/tắt trạng thái kích hoạt mã giảm giá
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID mã giảm giá không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { isActive } = body;

    const couponsCol = await getCouponsCollection();
    const coupon = await couponsCol.findOne({ _id: new ObjectId(id) });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy mã giảm giá.' },
        { status: 404 }
      );
    }

    const newStatus = typeof isActive === 'boolean' ? isActive : !coupon.isActive;

    await couponsCol.updateOne(
      { _id: coupon._id },
      {
        $set: {
          isActive: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: newStatus
        ? `Đã kích hoạt mã "${coupon.code}"`
        : `Đã tạm dừng mã "${coupon.code}"`,
      isActive: newStatus,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Coupon Status Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật trạng thái mã giảm giá.' },
      { status: 500 }
    );
  }
}

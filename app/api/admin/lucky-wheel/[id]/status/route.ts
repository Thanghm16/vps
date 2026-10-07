import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getLuckyWheelsCollection } from '@/lib/db/collections';
import { validateTotalProbability } from '@/lib/lucky-wheel/spin-engine';

export const runtime = 'nodejs';

/**
 * POST /api/admin/lucky-wheel/[id]/status
 * Thay đổi nhanh trạng thái active/inactive/enabled của vòng quay
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID vòng quay không hợp lệ.' }, { status: 400 });
    }

    const body = await request.json();
    const { status, enabled } = body || {};

    const wheelsCol = await getLuckyWheelsCollection();
    const wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!wheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay.' }, { status: 404 });
    }

    const updateFields: any = { updatedAt: new Date() };

    if (status !== undefined) {
      updateFields.status = status;
    }
    if (enabled !== undefined) {
      updateFields.enabled = !!enabled;
    }

    // Nếu kích hoạt vòng quay (status === 'active' & enabled === true), kiểm tra tổng xác suất phải đúng 100%
    const targetStatus = status !== undefined ? status : wheel.status;
    const targetEnabled = enabled !== undefined ? !!enabled : wheel.enabled;

    if (targetStatus === 'active' && targetEnabled) {
      const probCheck = validateTotalProbability(wheel.rewards || []);
      if (!probCheck.isValid) {
        return NextResponse.json(
          {
            success: false,
            message:
              probCheck.message ||
              'Không thể kích hoạt vòng quay vì tổng xác suất của các giải đang bật chưa đạt 100%.',
          },
          { status: 400 }
        );
      }
    }

    await wheelsCol.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật trạng thái vòng quay thành công!',
      status: targetStatus,
      enabled: targetEnabled,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/status POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật trạng thái: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

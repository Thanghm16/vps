import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getLuckyWheelsCollection } from '@/lib/db/collections';
import { LuckyWheelReward } from '@/types/lucky-wheel';

export const runtime = 'nodejs';

/**
 * POST /api/admin/lucky-wheel/[id]/rewards
 * Thêm phần thưởng mới vào vòng quay
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
    const {
      name,
      type = 'NOTHING',
      description = '',
      image = '',
      color = '#e11d48',
      textColor = '#ffffff',
      value = 0,
      quantity = -1,
      probability = 0,
      enabled = true,
      sortOrder,
      metadata = {},
    } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Tên phần thưởng không được để trống.' }, { status: 400 });
    }

    const wheelsCol = await getLuckyWheelsCollection();
    const wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!wheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay.' }, { status: 404 });
    }

    const currentRewards = wheel.rewards || [];
    const newReward: LuckyWheelReward = {
      id: `rew_${Date.now()}_${currentRewards.length}`,
      name: name.trim(),
      type,
      description: description.trim(),
      image: image.trim(),
      color,
      textColor,
      value: Number(value) || 0,
      quantity: quantity !== undefined ? Number(quantity) : -1,
      remainingQuantity: quantity !== undefined ? Number(quantity) : -1,
      probability: Number(probability) || 0,
      enabled: !!enabled,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : currentRewards.length,
      metadata,
    };

    await wheelsCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { rewards: newReward },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Đã thêm phần thưởng vào vòng quay!',
      reward: newReward,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/rewards POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi thêm phần thưởng: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/lucky-wheel/[id]/rewards
 * Cập nhật một phần thưởng cụ thể trong mảng rewards
 */
export async function PATCH(
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
    const { rewardId, ...fields } = body || {};

    if (!rewardId) {
      return NextResponse.json({ success: false, message: 'Mã phần thưởng (rewardId) là bắt buộc.' }, { status: 400 });
    }

    const wheelsCol = await getLuckyWheelsCollection();
    const wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!wheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay.' }, { status: 404 });
    }

    const updatedRewards = (wheel.rewards || []).map((r) => {
      if (r.id === rewardId) {
        return {
          ...r,
          ...fields,
          value: fields.value !== undefined ? Number(fields.value) : r.value,
          quantity: fields.quantity !== undefined ? Number(fields.quantity) : r.quantity,
          remainingQuantity:
            fields.remainingQuantity !== undefined
              ? Number(fields.remainingQuantity)
              : fields.quantity !== undefined && r.quantity !== fields.quantity
              ? Number(fields.quantity)
              : r.remainingQuantity,
          probability: fields.probability !== undefined ? Number(fields.probability) : r.probability,
        };
      }
      return r;
    });

    await wheelsCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          rewards: updatedRewards,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật phần thưởng thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/rewards PATCH Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật phần thưởng: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/lucky-wheel/[id]/rewards
 * Xóa một phần thưởng khỏi vòng quay
 */
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const rewardId = searchParams.get('rewardId');

    if (!rewardId) {
      return NextResponse.json({ success: false, message: 'Mã phần thưởng (rewardId) là bắt buộc.' }, { status: 400 });
    }

    const wheelsCol = await getLuckyWheelsCollection();
    await wheelsCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { rewards: { id: rewardId } as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Đã xóa phần thưởng khỏi vòng quay!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/rewards DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xóa phần thưởng: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

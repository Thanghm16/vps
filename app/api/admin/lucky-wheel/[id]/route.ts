import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getLuckyWheelsCollection, getLuckyWheelSpinsCollection } from '@/lib/db/collections';
import { LuckyWheelReward } from '@/types/lucky-wheel';
import { validateTotalProbability } from '@/lib/lucky-wheel/spin-engine';

export const runtime = 'nodejs';

/**
 * GET /api/admin/lucky-wheel/[id]
 * Lấy chi tiết đầy đủ của vòng quay cho Admin (kèm cả probability, quantity, remainingQuantity, metadata)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID vòng quay không hợp lệ.' }, { status: 400 });
    }

    const wheelsCol = await getLuckyWheelsCollection();
    const wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!wheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay may mắn.' }, { status: 404 });
    }

    const probCheck = validateTotalProbability(wheel.rewards || []);

    return NextResponse.json({
      success: true,
      wheel: {
        id: wheel._id?.toString(),
        name: wheel.name,
        slug: wheel.slug,
        description: wheel.description || '',
        thumbnail: wheel.thumbnail || '',
        status: wheel.status,
        startAt: wheel.startAt ? wheel.startAt.toISOString() : null,
        endAt: wheel.endAt ? wheel.endAt.toISOString() : null,
        spinCost: wheel.spinCost || 0,
        freeSpinsPerUser: wheel.freeSpinsPerUser || 0,
        dailySpinLimit: wheel.dailySpinLimit || null,
        maxSpinsPerUser: wheel.maxSpinsPerUser || null,
        requireLogin: wheel.requireLogin ?? true,
        enabled: wheel.enabled ?? true,
        rewards: wheel.rewards || [],
        rules: wheel.rules || '',
        seoTitle: wheel.seoTitle || '',
        seoDescription: wheel.seoDescription || '',
        totalProbability: probCheck.total,
        isProbabilityValid: probCheck.isValid,
        createdAt: wheel.createdAt.toISOString(),
        updatedAt: wheel.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id] GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/lucky-wheel/[id]
 * Cập nhật cấu hình vòng quay
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
    const wheelsCol = await getLuckyWheelsCollection();
    const currentWheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!currentWheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay cần cập nhật.' }, { status: 404 });
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateFields.name = String(body.name).trim();
    if (body.description !== undefined) updateFields.description = String(body.description).trim();
    if (body.thumbnail !== undefined) updateFields.thumbnail = String(body.thumbnail).trim();
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.startAt !== undefined) updateFields.startAt = body.startAt ? new Date(body.startAt) : null;
    if (body.endAt !== undefined) updateFields.endAt = body.endAt ? new Date(body.endAt) : null;
    if (body.spinCost !== undefined) updateFields.spinCost = Math.max(0, Number(body.spinCost) || 0);
    if (body.freeSpinsPerUser !== undefined)
      updateFields.freeSpinsPerUser = Math.max(0, Number(body.freeSpinsPerUser) || 0);
    if (body.dailySpinLimit !== undefined)
      updateFields.dailySpinLimit = body.dailySpinLimit ? Math.max(1, Number(body.dailySpinLimit)) : null;
    if (body.maxSpinsPerUser !== undefined)
      updateFields.maxSpinsPerUser = body.maxSpinsPerUser ? Math.max(1, Number(body.maxSpinsPerUser)) : null;
    if (body.requireLogin !== undefined) updateFields.requireLogin = !!body.requireLogin;
    if (body.enabled !== undefined) updateFields.enabled = !!body.enabled;
    if (body.rules !== undefined) updateFields.rules = String(body.rules);
    if (body.seoTitle !== undefined) updateFields.seoTitle = String(body.seoTitle);
    if (body.seoDescription !== undefined) updateFields.seoDescription = String(body.seoDescription);

    // Xử lý đổi slug
    if (body.slug !== undefined && body.slug !== currentWheel.slug) {
      const cleanSlug = String(body.slug)
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const duplicate = await wheelsCol.findOne({
        slug: cleanSlug,
        _id: { $ne: new ObjectId(id) },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Slug "${cleanSlug}" đã được sử dụng bởi vòng quay khác.` },
          { status: 400 }
        );
      }
      updateFields.slug = cleanSlug;
    }

    // Xử lý danh sách phần thưởng
    if (body.rewards !== undefined && Array.isArray(body.rewards)) {
      const normalizedRewards: LuckyWheelReward[] = body.rewards.map((r: any, idx: number) => ({
        id: r.id || `rew_${Date.now()}_${idx}`,
        name: r.name || `Phần thưởng ${idx + 1}`,
        type: r.type || 'NOTHING',
        description: r.description || '',
        image: r.image || '',
        color: r.color || (idx % 2 === 0 ? '#e11d48' : '#1e1b4b'),
        textColor: r.textColor || '#ffffff',
        value: Number(r.value) || 0,
        quantity: r.quantity !== undefined ? Number(r.quantity) : -1,
        remainingQuantity:
          r.remainingQuantity !== undefined
            ? Number(r.remainingQuantity)
            : r.quantity !== undefined
            ? Number(r.quantity)
            : -1,
        probability: Number(r.probability) || 0,
        enabled: r.enabled ?? true,
        sortOrder: r.sortOrder !== undefined ? Number(r.sortOrder) : idx,
        metadata: r.metadata || {},
      }));

      // Nếu trạng thái sau update là active, kiểm tra tổng xác suất phải = 100%
      const willBeActive =
        (updateFields.status || currentWheel.status) === 'active' &&
        (updateFields.enabled !== undefined ? updateFields.enabled : currentWheel.enabled);

      if (willBeActive) {
        const probCheck = validateTotalProbability(normalizedRewards);
        if (!probCheck.isValid) {
          return NextResponse.json(
            {
              success: false,
              message: probCheck.message || 'Không thể lưu khi tổng xác suất các giải đang bật chưa đủ 100%.',
            },
            { status: 400 }
          );
        }
      }

      updateFields.rewards = normalizedRewards;
    }

    await wheelsCol.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật vòng quay may mắn thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/lucky-wheel/[id]
 * Xóa vòng quay
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

    const wheelsCol = await getLuckyWheelsCollection();
    const deleteResult = await wheelsCol.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay để xóa.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa vòng quay may mắn thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xóa vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

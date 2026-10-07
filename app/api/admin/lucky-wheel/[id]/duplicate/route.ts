import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getLuckyWheelsCollection } from '@/lib/db/collections';
import { LuckyWheelDocument } from '@/types/lucky-wheel';

export const runtime = 'nodejs';

/**
 * POST /api/admin/lucky-wheel/[id]/duplicate
 * Nhân bản vòng quay thành bản sao mới ở trạng thái 'draft'
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

    const wheelsCol = await getLuckyWheelsCollection();
    const sourceWheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!sourceWheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay nguồn để nhân bản.' }, { status: 404 });
    }

    const now = new Date();
    const timestamp = Date.now().toString().slice(-4);
    const newSlug = `${sourceWheel.slug}-copy-${timestamp}`;
    const newName = `${sourceWheel.name} (Bản sao)`;

    // Tạo bản sao với các reward được cấp ID mới và khôi phục remainingQuantity = quantity
    const duplicatedRewards = (sourceWheel.rewards || []).map((r, idx) => ({
      ...r,
      id: `rew_${Date.now()}_${idx}`,
      remainingQuantity: r.quantity !== undefined ? r.quantity : -1,
    }));

    const newWheel: LuckyWheelDocument = {
      name: newName,
      slug: newSlug,
      description: sourceWheel.description,
      thumbnail: sourceWheel.thumbnail,
      status: 'draft',
      startAt: null,
      endAt: null,
      spinCost: sourceWheel.spinCost,
      freeSpinsPerUser: sourceWheel.freeSpinsPerUser,
      dailySpinLimit: sourceWheel.dailySpinLimit,
      maxSpinsPerUser: sourceWheel.maxSpinsPerUser,
      requireLogin: sourceWheel.requireLogin,
      enabled: false,
      rewards: duplicatedRewards,
      rules: sourceWheel.rules,
      seoTitle: `${newName} - Vòng Quay May Mắn`,
      seoDescription: sourceWheel.seoDescription,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await wheelsCol.insertOne(newWheel);

    return NextResponse.json({
      success: true,
      message: 'Nhân bản vòng quay thành công (ở trạng thái Nháp)!',
      wheelId: insertResult.insertedId.toString(),
      slug: newSlug,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/duplicate POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nhân bản vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

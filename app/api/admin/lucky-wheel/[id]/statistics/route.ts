import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getWheelStatistics } from '@/lib/lucky-wheel/wheel-db';
import { getLuckyWheelsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

/**
 * GET /api/admin/lucky-wheel/[id]/statistics
 * Lấy số liệu thống kê chi tiết vòng quay qua MongoDB Aggregation Pipeline
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID vòng quay không hợp lệ.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '7days') as 'today' | '7days' | '30days' | 'all';

    const wheelsCol = await getLuckyWheelsCollection();
    const wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });

    if (!wheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay.' }, { status: 404 });
    }

    const stats = await getWheelStatistics(new ObjectId(id), range);

    // Tính tổng tồn kho còn lại của các phần thưởng
    const rewardsStock = (wheel.rewards || []).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      quantity: r.quantity,
      remainingQuantity: r.remainingQuantity,
      probability: r.probability,
      enabled: r.enabled,
    }));

    return NextResponse.json({
      success: true,
      wheel: {
        id: wheel._id?.toString(),
        name: wheel.name,
        slug: wheel.slug,
        status: wheel.status,
      },
      stats,
      rewardsStock,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/statistics GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp thống kê vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

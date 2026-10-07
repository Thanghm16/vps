import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getLuckyWheelSpinsCollection, getLuckyWheelsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

/**
 * GET /api/admin/lucky-wheel/[id]/history
 * Lấy lịch sử quay người dùng của vòng quay dành cho Admin (kèm tìm kiếm username, lọc loại reward, phân trang)
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
    const username = searchParams.get('username')?.trim() || '';
    const rewardType = searchParams.get('rewardType')?.trim() || 'all';
    const status = searchParams.get('status')?.trim() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const spinsCol = await getLuckyWheelSpinsCollection();
    const wheelsCol = await getLuckyWheelsCollection();

    const wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });
    if (!wheel) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy vòng quay.' }, { status: 404 });
    }

    const query: any = { wheelId: new ObjectId(id) };

    if (username) {
      query.username = { $regex: username, $options: 'i' };
    }
    if (rewardType && rewardType !== 'all') {
      query.rewardType = rewardType;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const [spins, total] = await Promise.all([
      spinsCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      spinsCol.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      spins: spins.map((s) => ({
        id: s._id?.toString(),
        username: s.username,
        customerName: s.customerName,
        rewardId: s.rewardId,
        rewardName: s.rewardName,
        rewardType: s.rewardType,
        rewardValue: s.rewardValue,
        rewardImage: s.rewardImage,
        spinNumber: s.spinNumber,
        cost: s.cost,
        costType: s.costType,
        status: s.status,
        claimStatus: s.claimStatus,
        claimDetails: s.claimDetails,
        ip: s.ip,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      wheelName: wheel.name,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel/[id]/history GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp lịch sử quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

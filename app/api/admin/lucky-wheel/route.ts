import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getLuckyWheelsCollection, getLuckyWheelSpinsCollection } from '@/lib/db/collections';
import { LuckyWheelDocument, LuckyWheelReward } from '@/types/lucky-wheel';
import { validateTotalProbability } from '@/lib/lucky-wheel/spin-engine';

export const runtime = 'nodejs';

/**
 * GET /api/admin/lucky-wheel
 * Lấy danh sách tất cả các vòng quay trong hệ thống kèm phân trang, tìm kiếm
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const skip = (page - 1) * limit;

    const wheelsCol = await getLuckyWheelsCollection();
    const spinsCol = await getLuckyWheelSpinsCollection();

    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      wheelsCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      wheelsCol.countDocuments(query),
    ]);

    // Đếm tổng số lượt quay cho từng vòng quay
    const wheelIds = items.map((w) => w._id).filter(Boolean) as ObjectId[];
    const spinCounts = await spinsCol
      .aggregate([
        { $match: { wheelId: { $in: wheelIds } } },
        { $group: { _id: '$wheelId', totalSpins: { $sum: 1 } } },
      ])
      .toArray();

    const spinCountMap = new Map<string, number>();
    spinCounts.forEach((sc) => {
      spinCountMap.set(sc._id.toString(), sc.totalSpins);
    });

    const formattedItems = items.map((w) => {
      const probCheck = validateTotalProbability(w.rewards || []);
      return {
        id: w._id?.toString() || '',
        name: w.name,
        slug: w.slug,
        description: w.description || '',
        thumbnail: w.thumbnail || '',
        status: w.status,
        startAt: w.startAt ? w.startAt.toISOString() : null,
        endAt: w.endAt ? w.endAt.toISOString() : null,
        spinCost: w.spinCost || 0,
        freeSpinsPerUser: w.freeSpinsPerUser || 0,
        dailySpinLimit: w.dailySpinLimit || null,
        maxSpinsPerUser: w.maxSpinsPerUser || null,
        requireLogin: w.requireLogin ?? true,
        enabled: w.enabled ?? true,
        rewardsCount: (w.rewards || []).length,
        enabledRewardsCount: (w.rewards || []).filter((r) => r.enabled).length,
        totalProbability: probCheck.total,
        isProbabilityValid: probCheck.isValid,
        totalSpins: spinCountMap.get(w._id?.toString() || '') || 0,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      wheels: formattedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp danh sách vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/lucky-wheel
 * Tạo vòng quay may mắn mới
 */
export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      slug,
      description = '',
      thumbnail = '',
      status = 'draft',
      startAt = null,
      endAt = null,
      spinCost = 0,
      freeSpinsPerUser = 1,
      dailySpinLimit = null,
      maxSpinsPerUser = null,
      requireLogin = true,
      enabled = true,
      rewards = [],
      rules = '',
      seoTitle = '',
      seoDescription = '',
    } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Tên vòng quay không được để trống.' }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const wheelsCol = await getLuckyWheelsCollection();

    // Kiểm tra trùng slug
    const existing = await wheelsCol.findOne({ slug: cleanSlug });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Đường dẫn (slug) "${cleanSlug}" đã tồn tại. Vui lòng chọn tên khác.` },
        { status: 400 }
      );
    }

    // Nếu tạo ở trạng thái active, kiểm tra xác suất phải đủ 100%
    if (status === 'active' && enabled) {
      const probCheck = validateTotalProbability(rewards);
      if (!probCheck.isValid) {
        return NextResponse.json(
          {
            success: false,
            message: probCheck.message || 'Không thể kích hoạt vòng quay khi tổng xác suất chưa đủ 100%.',
          },
          { status: 400 }
        );
      }
    }

    // Gán ID cho từng reward nếu chưa có
    const normalizedRewards: LuckyWheelReward[] = rewards.map((r: any, idx: number) => ({
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

    const now = new Date();
    const newWheel: LuckyWheelDocument = {
      name: name.trim(),
      slug: cleanSlug,
      description: description.trim(),
      thumbnail: thumbnail.trim(),
      status: status || 'draft',
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      spinCost: Math.max(0, Number(spinCost) || 0),
      freeSpinsPerUser: Math.max(0, Number(freeSpinsPerUser) || 0),
      dailySpinLimit: dailySpinLimit ? Math.max(1, Number(dailySpinLimit)) : null,
      maxSpinsPerUser: maxSpinsPerUser ? Math.max(1, Number(maxSpinsPerUser)) : null,
      requireLogin: !!requireLogin,
      enabled: !!enabled,
      rewards: normalizedRewards,
      rules: rules || '',
      seoTitle: seoTitle || `${name.trim()} - Vòng Quay May Mắn`,
      seoDescription: seoDescription || description.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await wheelsCol.insertOne(newWheel);

    return NextResponse.json({
      success: true,
      message: 'Tạo vòng quay may mắn thành công!',
      wheelId: insertResult.insertedId.toString(),
      slug: cleanSlug,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền Administrator.' }, { status: 403 });
    }
    console.error('[API /api/admin/lucky-wheel POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tạo vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

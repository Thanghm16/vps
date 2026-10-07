import { ObjectId, Filter } from 'mongodb';
import {
  getLuckyWheelsCollection,
  getLuckyWheelSpinsCollection,
  getLuckyWheelUserStatsCollection,
} from '@/lib/db/collections';
import {
  LuckyWheelDocument,
  LuckyWheelClientData,
  LuckyWheelSpinDocument,
  LuckyWheelUserStatDocument,
} from '@/types/lucky-wheel';
import { getVietnamDateString } from './spin-engine';

/**
 * Ẩn bớt ký tự của username cho bảng vinh danh công khai (ví dụ: nguyen***99)
 */
export function maskUsername(username: string): string {
  if (!username) return 'Ẩn danh';
  const clean = username.trim();
  if (clean.length <= 3) {
    return clean.charAt(0) + '**';
  }
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-2);
  return `${prefix}***${suffix}`;
}

/**
 * Lấy vòng quay hoạt động đầu tiên hoặc theo slug
 */
export async function getActiveWheel(slugOrId?: string): Promise<LuckyWheelDocument | null> {
  const wheelsCol = await getLuckyWheelsCollection();
  const now = new Date();

  let query: Filter<LuckyWheelDocument> = {
    status: 'active',
    enabled: true,
  };

  if (slugOrId) {
    if (ObjectId.isValid(slugOrId)) {
      query = {
        $and: [
          query,
          {
            $or: [
              { _id: new ObjectId(slugOrId) },
              { slug: slugOrId.toLowerCase().trim() },
            ],
          },
        ],
      };
    } else {
      query = {
        ...query,
        slug: slugOrId.toLowerCase().trim(),
      };
    }
  }

  const wheel = await wheelsCol.findOne(query, {
    sort: { createdAt: -1 },
  });

  return wheel;
}

/**
 * Lấy thông tin thống kê lượt quay của user cho vòng quay
 */
export async function getUserWheelStat(
  wheelId: ObjectId,
  userId: ObjectId
): Promise<LuckyWheelUserStatDocument | null> {
  const statsCol = await getLuckyWheelUserStatsCollection();
  return statsCol.findOne({ wheelId, userId });
}

/**
 * Chuyển đổi LuckyWheelDocument thành dữ liệu an toàn cho Public Frontend
 */
export function sanitizeWheelForClient(
  wheel: LuckyWheelDocument,
  userStat?: LuckyWheelUserStatDocument | null
): LuckyWheelClientData {
  const todayStr = getVietnamDateString();
  const isNewDay = !userStat || userStat.dailyDate !== todayStr;
  const currentDailySpins = isNewDay ? 0 : userStat?.dailySpinsCount || 0;

  const freeRemaining = Math.max(
    0,
    (wheel.freeSpinsPerUser || 0) - (userStat?.freeSpinsUsed || 0)
  );
  const bonusRemaining = Math.max(0, userStat?.bonusSpins || 0);
  const dailyRemaining =
    wheel.dailySpinLimit && wheel.dailySpinLimit > 0
      ? Math.max(0, wheel.dailySpinLimit - currentDailySpins)
      : null;

  // Lọc và sắp xếp các phần thưởng hiển thị (chỉ lấy phần thưởng enabled)
  const sanitizedRewards = (wheel.rewards || [])
    .filter((r) => r.enabled)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      description: r.description,
      image: r.image,
      color: r.color,
      textColor: r.textColor,
      value: r.value,
      sortOrder: r.sortOrder,
    }));

  return {
    id: wheel._id?.toString() || '',
    name: wheel.name,
    slug: wheel.slug,
    description: wheel.description,
    thumbnail: wheel.thumbnail,
    status: wheel.status,
    startAt: wheel.startAt ? wheel.startAt.toISOString() : null,
    endAt: wheel.endAt ? wheel.endAt.toISOString() : null,
    spinCost: wheel.spinCost || 0,
    freeSpinsPerUser: wheel.freeSpinsPerUser || 0,
    dailySpinLimit: wheel.dailySpinLimit || null,
    maxSpinsPerUser: wheel.maxSpinsPerUser || null,
    requireLogin: wheel.requireLogin ?? true,
    enabled: wheel.enabled ?? true,
    rewards: sanitizedRewards,
    rules: wheel.rules,
    seoTitle: wheel.seoTitle || `${wheel.name} - Vòng Quay May Mắn Nhận Quà Khủng`,
    seoDescription:
      wheel.seoDescription ||
      wheel.description ||
      'Tham gia Vòng Quay May Mắn trúng nick game vip, mã giảm giá và nhiều phần quà hấp dẫn.',
    userStats: userStat
      ? {
          freeSpinsRemaining: freeRemaining,
          bonusSpinsRemaining: bonusRemaining,
          totalAvailableSpins: freeRemaining + bonusRemaining,
          dailySpinsRemaining: dailyRemaining,
          totalSpinsUsed: userStat.totalSpins || 0,
        }
      : undefined,
  };
}

/**
 * Lấy danh sách người trúng thưởng mới nhất (Public Feed)
 */
export async function getRecentWinners(wheelId?: ObjectId, limit = 15) {
  const spinsCol = await getLuckyWheelSpinsCollection();
  const query: Filter<LuckyWheelSpinDocument> = {
    status: 'SUCCESS',
    rewardType: { $ne: 'NOTHING' },
  };

  if (wheelId) {
    query.wheelId = wheelId;
  }

  const items = await spinsCol
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return items.map((spin) => ({
    id: spin._id?.toString() || '',
    username: maskUsername(spin.username),
    rewardName: spin.rewardName,
    rewardType: spin.rewardType,
    rewardValue: spin.rewardValue,
    rewardImage: spin.rewardImage,
    wheelName: spin.wheelName,
    createdAt: spin.createdAt.toISOString(),
  }));
}

/**
 * Lấy lịch sử quay cá nhân của user
 */
export async function getUserSpins(
  wheelId: ObjectId,
  userId: ObjectId,
  page = 1,
  limit = 20
) {
  const spinsCol = await getLuckyWheelSpinsCollection();
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    spinsCol
      .find({ wheelId, userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    spinsCol.countDocuments({ wheelId, userId }),
  ]);

  return {
    items: items.map((spin) => ({
      id: spin._id?.toString() || '',
      rewardId: spin.rewardId,
      rewardName: spin.rewardName,
      rewardType: spin.rewardType,
      rewardValue: spin.rewardValue,
      rewardImage: spin.rewardImage,
      spinNumber: spin.spinNumber,
      cost: spin.cost,
      costType: spin.costType,
      status: spin.status,
      claimStatus: spin.claimStatus,
      claimDetails: spin.claimDetails,
      createdAt: spin.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * MongoDB Aggregation Analytics cho Admin Dashboard của vòng quay
 */
export async function getWheelStatistics(
  wheelId: ObjectId,
  range: 'today' | '7days' | '30days' | 'all' = '7days'
) {
  const spinsCol = await getLuckyWheelSpinsCollection();
  const now = new Date();
  let startDate: Date | null = null;

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === '7days') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '30days') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const matchFilter: any = { wheelId, status: 'SUCCESS' };
  if (startDate) {
    matchFilter.createdAt = { $gte: startDate };
  }

  // 1. Tổng quan số liệu (Overview)
  const overviewAgg = await spinsCol
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalSpins: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalRevenue: { $sum: '$cost' },
          totalPrizesAwarded: {
            $sum: { $cond: [{ $ne: ['$rewardType', 'NOTHING'] }, 1, 0] },
          },
          totalPrizeValue: {
            $sum: {
              $cond: [
                { $in: ['$rewardType', ['MONEY', 'ACCOUNT', 'PRODUCT']] },
                '$rewardValue',
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const overview = overviewAgg[0] || {
    totalSpins: 0,
    uniqueUsers: [],
    totalRevenue: 0,
    totalPrizesAwarded: 0,
    totalPrizeValue: 0,
  };

  // 2. Thống kê theo loại phần thưởng
  const rewardsBreakdown = await spinsCol
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$rewardName',
          rewardType: { $first: '$rewardType' },
          count: { $sum: 1 },
          totalValue: { $sum: '$rewardValue' },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  // 3. Xu hướng theo ngày (Daily trend)
  const dailyTrends = await spinsCol
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: '+07:00',
            },
          },
          spins: { $sum: 1 },
          revenue: { $sum: '$cost' },
          prizes: {
            $sum: { $cond: [{ $ne: ['$rewardType', 'NOTHING'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return {
    totalSpins: overview.totalSpins,
    totalParticipants: Array.isArray(overview.uniqueUsers) ? overview.uniqueUsers.length : 0,
    totalRevenue: overview.totalRevenue,
    totalPrizesAwarded: overview.totalPrizesAwarded,
    totalPrizeValue: overview.totalPrizeValue,
    rewardsBreakdown: rewardsBreakdown.map((r) => ({
      name: r._id,
      type: r.rewardType,
      count: r.count,
      totalValue: r.totalValue,
    })),
    dailyTrends: dailyTrends.map((d) => ({
      date: d._id,
      spins: d.spins,
      revenue: d.revenue,
      prizes: d.prizes,
    })),
  };
}

import { NextResponse } from 'next/server';
import {
  getAccountsCollection,
  getGamesCollection,
  getOrdersCollection,
  getTransactionsCollection,
  getUsersCollection,
} from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/server';
import { AdminOrder, GameSalesMetric, RevenueChartPoint } from '@/types/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateDaysTimeline(days: number, orders: { amount: number; createdAt: Date }[]): RevenueChartPoint[] {
  const result: RevenueChartPoint[] = [];
  const now = new Date();

  const map = new Map<string, { revenue: number; orders: number }>();
  for (const ord of orders) {
    if (!ord.createdAt) continue;
    const d = new Date(ord.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const curr = map.get(key) || { revenue: 0, orders: 0 };
    curr.revenue += ord.amount || 0;
    curr.orders += 1;
    map.set(key, curr);
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const stat = map.get(key) || { revenue: 0, orders: 0 };
    result.push({
      label,
      revenue: stat.revenue,
      orders: stat.orders,
    });
  }

  return result;
}

function generateMonthsTimeline(months: number, orders: { amount: number; createdAt: Date }[]): RevenueChartPoint[] {
  const result: RevenueChartPoint[] = [];
  const now = new Date();

  const map = new Map<string, { revenue: number; orders: number }>();
  for (const ord of orders) {
    if (!ord.createdAt) continue;
    const d = new Date(ord.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const curr = map.get(key) || { revenue: 0, orders: 0 };
    curr.revenue += ord.amount || 0;
    curr.orders += 1;
    map.set(key, curr);
  }

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `Th${d.getMonth() + 1}`;
    const stat = map.get(key) || { revenue: 0, orders: 0 };
    result.push({
      label,
      revenue: stat.revenue,
      orders: stat.orders,
    });
  }

  return result;
}

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const [
      accountsCollection,
      gamesCollection,
      ordersCollection,
      transactionsCollection,
      usersCollection,
    ] = await Promise.all([
      getAccountsCollection(),
      getGamesCollection(),
      getOrdersCollection(),
      getTransactionsCollection(),
      getUsersCollection(),
    ]);

    const [
      availableCount,
      soldCount,
      reservedCount,
      hiddenCount,
      totalAccounts,
      totalGames,
      newCustomers,
      pendingTransactions,
      todayOrdersAgg,
      totalRevenueAgg,
      chartOrdersRaw,
      gameAgg,
      recentRawOrders,
    ] = await Promise.all([
      accountsCollection.countDocuments({ status: 'available' }),
      accountsCollection.countDocuments({ status: 'sold' }),
      accountsCollection.countDocuments({ status: 'reserved' }),
      accountsCollection.countDocuments({ status: 'hidden' }),
      accountsCollection.countDocuments({}),
      gamesCollection.countDocuments({}),
      usersCollection.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      transactionsCollection.countDocuments({ status: 'pending' }),
      ordersCollection
        .aggregate([
          { $match: { createdAt: { $gte: todayStart } } },
          {
            $group: {
              _id: null,
              revenueToday: { $sum: '$amount' },
              ordersToday: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      ordersCollection
        .aggregate([
          { $match: { status: { $in: ['paid', 'delivered'] } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$amount' },
            },
          },
        ])
        .toArray(),
      ordersCollection
        .find({ createdAt: { $gte: twelveMonthsAgo } })
        .project({ amount: 1, createdAt: 1 })
        .toArray(),
      ordersCollection
        .aggregate([
          {
            $group: {
              _id: '$gameName',
              gameSlug: { $first: '$gameSlug' },
              accountsSold: { $sum: 1 },
              revenue: { $sum: '$amount' },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 8 },
        ])
        .toArray(),
      ordersCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    const revenueToday = todayOrdersAgg.length > 0 ? todayOrdersAgg[0].revenueToday || 0 : 0;
    const ordersToday = todayOrdersAgg.length > 0 ? todayOrdersAgg[0].ordersToday || 0 : 0;
    const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].totalRevenue || 0 : 0;

    // Timeline chart data
    const chartOrders = chartOrdersRaw.map((o) => ({
      amount: o.amount || 0,
      createdAt: new Date(o.createdAt),
    }));
    const data7d = generateDaysTimeline(7, chartOrders);
    const data30d = generateDaysTimeline(30, chartOrders);
    const data12m = generateMonthsTimeline(12, chartOrders);

    // Sales by game metrics
    const totalGameRevenue = gameAgg.reduce((acc, g) => acc + (g.revenue || 0), 0) || 1;
    const badgeColors = [
      'from-rose-500 to-pink-500',
      'from-amber-500 to-yellow-500',
      'from-emerald-500 to-teal-500',
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-pink-500 to-rose-500',
    ];

    const salesByGame: GameSalesMetric[] = gameAgg.map((g, idx) => ({
      gameId: g.gameSlug || g._id || `game-${idx}`,
      gameName: g._id || 'Khác',
      accountsSold: g.accountsSold || 0,
      revenue: g.revenue || 0,
      percentage: Math.round(((g.revenue || 0) / totalGameRevenue) * 100),
      badgeColor: badgeColors[idx % badgeColors.length],
    }));

    // Recent orders formatted
    const recentOrders: AdminOrder[] = recentRawOrders.map((ord) => ({
      id: ord._id?.toString() || ord.code,
      code: ord.code,
      customerName: ord.customerName || 'Khách hàng',
      customerEmail: ord.customerEmail || '',
      customerPhone: ord.customerPhone || '',
      accountCode: ord.accountCode,
      accountThumbnail: ord.accountThumbnail || '',
      gameId: ord.gameSlug,
      gameName: ord.gameName,
      amount: ord.amount,
      paymentMethod: ord.paymentMethod,
      status: ord.status,
      createdAt: ord.createdAt
        ? new Date(ord.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'Vừa xong',
      deliveryCredentials: ord.deliveryCredentials
        ? {
            username: ord.deliveryCredentials.username || '',
            password: ord.deliveryCredentials.password || '',
            note: ord.deliveryCredentials.note || '',
          }
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        availableCount,
        soldCount,
        reservedCount,
        hiddenCount,
        totalAccounts,
        totalGames,
        revenueToday,
        ordersToday,
        newCustomers,
        pendingTransactions,
        totalRevenue,
      },
      charts: {
        data7d,
        data30d,
        data12m,
      },
      salesByGame,
      recentOrders,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[API Admin Stats Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ.' }, { status: 500 });
  }
}

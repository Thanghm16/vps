import { NextResponse } from 'next/server';
import { getOrdersCollection, getTransactionsCollection, getAccountsCollection } from '@/lib/db/collections';
import { formatRelativeTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface LiveActivity {
  id: string;
  type: 'buy' | 'deposit';
  user: string;
  avatar: string;
  game?: string;
  detail: string;
  time: string;
  price: number;
  timestamp: number;
}

function maskUser(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return 'khach_hang***';
  }
  const clean = rawName.trim().replace(/@.*$/, '').replace(/[^a-zA-Z0-9_]/g, '');
  if (clean.length <= 2) {
    return `${clean}***`;
  }
  const visibleLen = Math.min(clean.length - 2, 6);
  return `${clean.slice(0, visibleLen)}***`;
}

export async function GET() {
  try {
    const ordersCol = await getOrdersCollection();
    const transactionsCol = await getTransactionsCollection();
    const accountsCol = await getAccountsCollection();

    // 1. Lấy đơn hàng thực tế từ MongoDB (chỉ lấy các field cần thiết)
    const [recentOrders, recentDeposits, soldAccounts] = await Promise.all([
      ordersCol
        .find(
          { status: { $in: ['paid', 'delivered'] } },
          {
            projection: {
              code: 1,
              username: 1,
              customerName: 1,
              gameName: 1,
              accountTitle: 1,
              accountCode: 1,
              amount: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(15)
        .toArray(),

      transactionsCol
        .find(
          { status: 'success', transferType: 'in', amount: { $gt: 0 } },
          {
            projection: {
              code: 1,
              username: 1,
              customerName: 1,
              gateway: 1,
              amount: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(15)
        .toArray(),

      accountsCol
        .find(
          { status: 'sold' },
          {
            projection: {
              code: 1,
              title: 1,
              gameName: 1,
              price: 1,
              updatedAt: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(15)
        .toArray(),
    ]);

    const realActivities: LiveActivity[] = [];
    const seenOrderAccountCodes = new Set<string>();

    // Map đơn hàng thực tế
    for (const order of recentOrders) {
      const createdAtDate = order.createdAt ? new Date(order.createdAt) : new Date();
      if (order.accountCode) {
        seenOrderAccountCodes.add(order.accountCode);
      }
      realActivities.push({
        id: `order-${order._id?.toString() || order.code}`,
        type: 'buy',
        user: maskUser(order.username || order.customerName),
        avatar: '/user-default.jpg',
        game: order.gameName,
        detail: `vừa mua thành công Nick ${order.accountTitle || order.accountCode || 'VIP'}`,
        time: formatRelativeTime(createdAtDate),
        price: order.amount || 0,
        timestamp: createdAtDate.getTime(),
      });
    }

    // Map giao dịch nạp tiền thực tế
    for (const tx of recentDeposits) {
      const createdAtDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
      const gatewayName = tx.gateway ? tx.gateway.toUpperCase() : 'VIETQR 24/7';
      realActivities.push({
        id: `tx-${tx._id?.toString() || tx.code}`,
        type: 'deposit',
        user: maskUser(tx.username || tx.customerName || 'khach_hang'),
        avatar: '/user-default.jpg',
        detail: `vừa nạp ${Number(tx.amount || 0).toLocaleString('vi-VN')}đ qua ${gatewayName}`,
        time: formatRelativeTime(createdAtDate),
        price: tx.amount || 0,
        timestamp: createdAtDate.getTime(),
      });
    }

    // Map các nick đã bán thực tế từ kho MongoDB
    for (const acc of soldAccounts) {
      if (!seenOrderAccountCodes.has(acc.code)) {
        const d = acc.updatedAt ? new Date(acc.updatedAt) : (acc.createdAt ? new Date(acc.createdAt) : new Date());
        const cleanCode = acc.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        realActivities.push({
          id: `acc-sold-${acc._id?.toString() || acc.code}`,
          type: 'buy',
          user: `gamer_${cleanCode.slice(-4)}***`,
          avatar: '/user-default.jpg',
          game: acc.gameName,
          detail: `vừa mua thành công Nick ${acc.title || acc.code}`,
          time: formatRelativeTime(d),
          price: acc.price || 0,
          timestamp: d.getTime(),
        });
      }
    }

    // Sắp xếp theo thời gian mới nhất
    realActivities.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(
      {
        success: true,
        activities: realActivities,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
        },
      }
    );
  } catch (error) {
    console.error('[API GET Activities Error]:', error);
    return NextResponse.json({
      success: false,
      activities: [],
      error: (error as Error).message,
    });
  }
}

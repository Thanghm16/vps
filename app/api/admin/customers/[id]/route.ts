import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import {
  getUsersCollection,
  getOrdersCollection,
  getTransactionsCollection,
} from '@/lib/db/collections';

export const runtime = 'nodejs';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (user.role !== 'admin') return { error: 'Forbidden', status: 403 };
  return { user };
}

// GET /api/admin/customers/[id] — Chi tiết khách hàng + đơn hàng + giao dịch
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const userObjectId = new ObjectId(id);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ _id: userObjectId });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    // Lấy đơn hàng
    const ordersCol = await getOrdersCollection();
    const orders = await ordersCol
      .find({ $or: [{ userId: userObjectId }, { username: user.username }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // Lấy giao dịch
    const txCol = await getTransactionsCollection();
    const transactions = await txCol
      .find({
        $or: [
          { userId: userObjectId },
          { customerName: user.username },
          { username: user.username },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const totalSpent = orders
      .filter((o) => ['delivered', 'completed', 'success'].includes(o.status))
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    let vipLevel = 'Thành Viên';
    if (totalSpent >= 50_000_000) vipLevel = 'VIP Kim Cương';
    else if (totalSpent >= 10_000_000) vipLevel = 'VIP 4';
    else if (totalSpent >= 3_000_000) vipLevel = 'VIP 3';
    else if (totalSpent >= 1_000_000) vipLevel = 'VIP 2';
    else if (totalSpent >= 200_000) vipLevel = 'VIP 1';

    const fmtOrders = orders.map((o) => ({
      id: o._id?.toString(),
      code: o.code,
      accountCode: o.accountCode,
      accountTitle: o.accountTitle,
      gameName: o.gameName,
      amount: o.amount,
      status: o.status,
      createdAt: o.createdAt
        ? new Date(o.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '—',
    }));

    const fmtTransactions = transactions.map((t) => ({
      id: t._id?.toString(),
      code: t.code,
      amount: t.amount,
      transferType: t.transferType,
      status: t.status,
      content: t.content,
      gateway: t.gateway,
      time: t.createdAt
        ? new Date(t.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '—',
    }));

    return NextResponse.json({
      success: true,
      customer: {
        id: user._id?.toString(),
        userCode: user.userCode,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        balance: user.balance || 0,
        avatar: user.avatar || null,
        vipLevel,
        ordersCount: orders.length,
        totalSpent,
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—',
        lastLoginAt: user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : null,
      },
      orders: fmtOrders,
      transactions: fmtTransactions,
    });
  } catch (error) {
    console.error('[Admin Customer Detail Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải chi tiết khách hàng.' },
      { status: 500 }
    );
  }
}

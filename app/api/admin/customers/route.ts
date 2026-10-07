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
  if (!user) return { error: 'Chưa đăng nhập.', status: 401 };
  if (user.role !== 'admin') return { error: 'Không có quyền truy cập.', status: 403 };
  return { user };
}

// GET /api/admin/customers — Danh sách toàn bộ tài khoản (user + admin)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1',  10));
    const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip   = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || 'all'; // all | active | blocked
    const role   = searchParams.get('role')   || 'all'; // all | user | admin

    const usersCol = await getUsersCollection();

    // Xây filter
    const filter: Record<string, any> = {};
    if (status !== 'all') filter.status = status;
    if (role   !== 'all') filter.role   = role;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      usersCol.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      usersCol.countDocuments(filter),
    ]);

    // Thống kê đơn hàng theo userId (batch)
    const ordersCol  = await getOrdersCollection();
    const userIds    = users.map((u) => u._id);
    const orderStats = await ordersCol
      .aggregate([
        {
          $match: {
            userId: { $in: userIds },
            status: { $in: ['delivered', 'completed', 'success'] },
          },
        },
        { $group: { _id: '$userId', ordersCount: { $sum: 1 }, totalSpent: { $sum: '$amount' } } },
      ])
      .toArray();

    const statsMap = new Map(orderStats.map((s) => [s._id?.toString(), s]));

    const formatted = users.map((u) => {
      const stats      = statsMap.get(u._id?.toString() || '');
      const totalSpent = stats?.totalSpent || 0;

      let vipLevel = 'Thành Viên';
      if      (totalSpent >= 50_000_000) vipLevel = 'VIP Kim Cương';
      else if (totalSpent >= 10_000_000) vipLevel = 'VIP 4';
      else if (totalSpent >= 3_000_000)  vipLevel = 'VIP 3';
      else if (totalSpent >= 1_000_000)  vipLevel = 'VIP 2';
      else if (totalSpent >= 200_000)    vipLevel = 'VIP 1';

      return {
        id:          u._id?.toString(),
        userCode:    u.userCode,
        username:    u.username,
        email:       u.email,
        role:        u.role,
        status:      u.status,
        balance:     u.balance || 0,
        avatar:      u.avatar  || null,
        vipLevel,
        ordersCount: stats?.ordersCount || 0,
        totalSpent,
        createdAt:   u.createdAt
          ? new Date(u.createdAt).toLocaleDateString('vi-VN')
          : '—',
        lastLoginAt: u.lastLoginAt
          ? new Date(u.lastLoginAt).toLocaleString('vi-VN', {
              hour: '2-digit', minute: '2-digit',
              day:  '2-digit', month: '2-digit', year: 'numeric',
            })
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      customers: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('[Admin Customers GET]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải danh sách.' }, { status: 500 });
  }
}

// PATCH /api/admin/customers — Cập nhật trạng thái / quyền / số dư
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const body              = await request.json();
    const { userId, action, amount } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu userId.' }, { status: 400 });
    }

    const usersCol     = await getUsersCollection();
    const userObjectId = new ObjectId(userId);
    const targetUser   = await usersCol.findOne({ _id: userObjectId });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    // ── Khóa / Mở khóa ─────────────────────────────────────────────────────
    if (action === 'block' || action === 'unblock') {
      const newStatus = action === 'block' ? 'blocked' : 'active';
      await usersCol.updateOne(
        { _id: userObjectId },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );
      return NextResponse.json({
        success: true,
        message: action === 'block'
          ? `Đã khóa tài khoản ${targetUser.username}.`
          : `Đã mở khóa tài khoản ${targetUser.username}.`,
        newStatus,
      });
    }

    // ── Đổi quyền ──────────────────────────────────────────────────────────
    if (action === 'set_role') {
      const { newRole } = body as { newRole?: 'user' | 'admin' };
      if (!newRole || !['user', 'admin'].includes(newRole)) {
        return NextResponse.json({ success: false, message: 'Quyền không hợp lệ.' }, { status: 400 });
      }
      // Không cho phép tự hạ quyền chính mình
      if (targetUser._id?.toString() === auth.user.id) {
        return NextResponse.json(
          { success: false, message: 'Không thể tự thay đổi quyền của chính mình.' },
          { status: 400 }
        );
      }
      await usersCol.updateOne(
        { _id: userObjectId },
        { $set: { role: newRole, updatedAt: new Date() } }
      );
      return NextResponse.json({
        success:  true,
        message:  newRole === 'admin'
          ? `Đã nâng ${targetUser.username} lên quyền Admin.`
          : `Đã hạ ${targetUser.username} xuống quyền Người Dùng.`,
        newRole,
      });
    }

    // ── Nạp tiền thủ công ──────────────────────────────────────────────────
    if (action === 'add_balance') {
      const addAmount = Number(amount);
      if (!addAmount || addAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Số tiền không hợp lệ.' }, { status: 400 });
      }
      await usersCol.updateOne(
        { _id: userObjectId },
        { $inc: { balance: addAmount }, $set: { updatedAt: new Date() } }
      );
      await _logTransaction(userId, targetUser.username, addAmount, 'in', 'Admin nạp tiền thủ công');
      const updated = await usersCol.findOne({ _id: userObjectId });
      return NextResponse.json({
        success: true,
        message: `Đã nạp ${addAmount.toLocaleString('vi-VN')}₫ vào ví ${targetUser.username}.`,
        newBalance: updated?.balance || 0,
      });
    }

    // ── Trừ tiền thủ công ──────────────────────────────────────────────────
    if (action === 'deduct_balance') {
      const deductAmount = Number(amount);
      if (!deductAmount || deductAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Số tiền không hợp lệ.' }, { status: 400 });
      }
      if ((targetUser.balance || 0) < deductAmount) {
        return NextResponse.json({
          success: false,
          message: `Số dư không đủ. Hiện có: ${(targetUser.balance || 0).toLocaleString('vi-VN')}₫`,
        }, { status: 400 });
      }
      await usersCol.updateOne(
        { _id: userObjectId },
        { $inc: { balance: -deductAmount }, $set: { updatedAt: new Date() } }
      );
      await _logTransaction(userId, targetUser.username, -deductAmount, 'out', 'Admin trừ tiền thủ công');
      const updated = await usersCol.findOne({ _id: userObjectId });
      return NextResponse.json({
        success: true,
        message: `Đã trừ ${deductAmount.toLocaleString('vi-VN')}₫ từ ví ${targetUser.username}.`,
        newBalance: updated?.balance || 0,
      });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Customers PATCH]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper: ghi log giao dịch
async function _logTransaction(
  userId: string,
  username: string,
  amount: number,
  transferType: 'in' | 'out',
  content: string
) {
  try {
    const txCol    = await getTransactionsCollection();
    const ts       = Date.now().toString().slice(-8);
    const prefix   = transferType === 'in' ? 'TX-ADMIN-NAP' : 'TX-ADMIN-TRU';
    await txCol.insertOne({
      code:            `${prefix}-${ts}`,
      gateway:         'Admin',
      accountNumber:   username,
      content,
      transferType,
      amount,
      transactionDate: new Date().toISOString(),
      status:          'success',
      customerName:    username,
      userId:          new ObjectId(userId),
      username,
      createdAt:       new Date(),
      updatedAt:       new Date(),
    });
  } catch (e) {
    console.warn('[Log Transaction Error]:', e);
  }
}

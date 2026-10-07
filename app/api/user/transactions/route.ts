import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getTransactionsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để xem lịch sử.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const txCol = await getTransactionsCollection();

    // Query transactions by customer username
    const filter = {
      $or: [
        { customerName: user.username },
        { customerPhone: user.email },
        { description: { $regex: user.username, $options: 'i' } },
      ],
    };

    const [transactions, total] = await Promise.all([
      txCol
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      txCol.countDocuments(filter),
    ]);

    const formatted = transactions.map((t) => ({
      id: t._id?.toString() || t.code,
      code: t.code,
      orderCode: t.orderCode,
      amount: t.amount,
      paymentMethod: t.gateway || 'VietQR',
      status: t.status,
      time: t.createdAt
        ? new Date(t.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'Vừa xong',
      bankReference: t.referenceCode || t.accountNumber,
      description: t.content,
    }));

    return NextResponse.json({
      success: true,
      transactions: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('[User Transactions GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải lịch sử giao dịch: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

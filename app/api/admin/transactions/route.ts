import { NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { getTransactionsCollection } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/server';
import { TransactionDocument } from '@/types/db-transaction';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '15', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 15 : rawLimit), 100);

    const query: Filter<TransactionDocument> = {};
    if (method !== 'all') {
      if (method === 'vietqr') {
        (query as Record<string, unknown>).gateway = { $exists: true };
      }
    }
    if (status !== 'all') {
      query.status = status as TransactionDocument['status'];
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      (query as Record<string, unknown>).$or = [
        { code: regex },
        { content: regex },
        { orderCode: regex },
        { accountCode: regex },
        { customerName: regex },
        { username: regex },
        { referenceCode: regex },
        { accountNumber: regex },
      ];
    }

    const transactionsCollection = await getTransactionsCollection();
    const total = await transactionsCollection.countDocuments(query);
    const skip = (page - 1) * limit;

    const list = await transactionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      transactions: list.map((txn) => ({
        id: txn._id?.toString() || txn.code,
        _id: txn._id?.toString(),
        code: txn.code,
        orderCode: txn.orderCode || (txn.accountCode ? `Mua ${txn.accountCode}` : txn.username ? `Nạp ví @${txn.username}` : 'Chuyển khoản VietQR'),
        customerName: txn.customerName || txn.username || 'Khách hàng VietQR',
        amount: txn.amount,
        paymentMethod: 'vietqr',
        status: txn.status,
        time: txn.transactionDate || (txn.createdAt ? new Date(txn.createdAt).toLocaleString('vi-VN') : ''),
        bankReference: txn.referenceCode || (txn.sepayId ? `SePay #${txn.sepayId}` : ''),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[API Admin Transactions Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { getOrdersCollection } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/server';
import { OrderDocument } from '@/types/db-order';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '15', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 15 : rawLimit), 100);

    const query: Filter<OrderDocument> = {};
    if (status !== 'all') {
      query.status = status as OrderDocument['status'];
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      (query as Record<string, unknown>).$or = [
        { code: regex },
        { accountCode: regex },
        { customerName: regex },
        { customerPhone: regex },
        { gameName: regex },
      ];
    }

    const ordersCollection = await getOrdersCollection();
    const total = await ordersCollection.countDocuments(query);
    const skip = (page - 1) * limit;

    const list = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      orders: list.map((ord) => ({
        id: ord._id?.toString() || ord.code,
        _id: ord._id?.toString(),
        code: ord.code,
        customerName: ord.customerName,
        customerEmail: ord.customerEmail || '',
        customerPhone: ord.customerPhone || '',
        accountCode: ord.accountCode,
        accountThumbnail: ord.accountThumbnail || '',
        gameId: ord.gameSlug,
        gameName: ord.gameName,
        amount: ord.amount,
        paymentMethod: ord.paymentMethod,
        status: ord.status,
        createdAt: ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '',
        deliveryCredentials: ord.deliveryCredentials,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[API Admin Orders Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ.' }, { status: 500 });
  }
}

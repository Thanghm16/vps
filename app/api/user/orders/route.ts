import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import { getOrdersCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để xem danh sách nick đã mua.' },
        { status: 401 }
      );
    }

    const ordersCol = await getOrdersCollection();
    const userObjectId = new ObjectId(user.id);

    const filter = {
      $or: [
        { userId: userObjectId },
        { username: user.username },
        { customerName: user.username },
      ],
    };

    const orders = await ordersCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const formattedOrders = orders.map((o) => ({
      id: o._id?.toString() || o.code,
      code: o.code,
      accountCode: o.accountCode,
      accountTitle: o.accountTitle,
      accountThumbnail: o.accountThumbnail || '',
      gameSlug: o.gameSlug,
      gameName: o.gameName,
      amount: o.amount,
      status: o.status,
      paymentMethod: o.paymentMethod,
      credentials: o.deliveryCredentials || {},
      createdAt: o.createdAt
        ? new Date(o.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'Vừa xong',
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      total: formattedOrders.length,
    });
  } catch (error) {
    console.error('[API User Orders Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải kho nick đã mua.' },
      { status: 500 }
    );
  }
}

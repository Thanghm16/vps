import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getAccountsCollection } from '@/lib/db/collections';
import { validateCouponServerSide } from '@/lib/coupons/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, accountCode, amount } = body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mã giảm giá.' },
        { status: 400 }
      );
    }

    let orderAmount = 0;
    let account = null;

    if (accountCode && typeof accountCode === 'string') {
      const cleanAccCode = accountCode.trim().toUpperCase();
      const formattedAccCode = cleanAccCode.startsWith('#')
        ? cleanAccCode
        : `#${cleanAccCode}`;

      const accountsCol = await getAccountsCollection();
      account = await accountsCol.findOne({
        $or: [{ code: formattedAccCode }, { code: cleanAccCode }],
      });

      if (!account) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản game để áp dụng mã.' },
          { status: 404 }
        );
      }

      orderAmount = account.price;
    } else if (typeof amount === 'number' && amount > 0) {
      orderAmount = amount;
    } else {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin giá trị đơn hàng hoặc mã tài khoản.' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    const result = await validateCouponServerSide({
      code: code.trim().toUpperCase(),
      orderAmount,
      account,
      userId: user?.id,
    });

    if (!result.valid || !result.coupon) {
      return NextResponse.json(
        { success: false, message: result.message || 'Mã giảm giá không hợp lệ.' },
        { status: 400 }
      );
    }

    // Chỉ trả về dữ liệu an toàn cho client, không lộ các cấu hình nhạy cảm
    return NextResponse.json({
      success: true,
      message: `Áp dụng mã ${result.coupon.code} thành công! Tiết kiệm ${result.discountAmount.toLocaleString('vi-VN')} ₫`,
      coupon: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        description: result.coupon.description || '',
        minOrderValue: result.coupon.minOrderValue || 0,
        maxDiscount: result.coupon.maxDiscount || null,
      },
      discountAmount: result.discountAmount,
      subtotal: result.subtotal,
      finalTotal: result.finalTotal,
    });
  } catch (error) {
    console.error('[API Coupon Validate Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống khi kiểm tra mã giảm giá.' },
      { status: 500 }
    );
  }
}

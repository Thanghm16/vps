import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getCouponsCollection, getOrdersCollection } from '@/lib/db/collections';
import { CouponDocument, CouponType } from '@/types/db-coupon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Chi tiết mã giảm giá và lịch sử sử dụng
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID mã giảm giá không hợp lệ.' },
        { status: 400 }
      );
    }

    const couponsCol = await getCouponsCollection();
    const coupon = await couponsCol.findOne({ _id: new ObjectId(id) });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy mã giảm giá.' },
        { status: 404 }
      );
    }

    // Lấy danh sách đơn hàng đã dùng mã này
    const ordersCol = await getOrdersCollection();
    const usageOrders = await ordersCol
      .find({ couponCode: coupon.code })
      .sort({ createdAt: -1 })
      .limit(20)
      .project({
        code: 1,
        customerName: 1,
        accountCode: 1,
        gameName: 1,
        amount: 1,
        discountAmount: 1,
        createdAt: 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon._id?.toString(),
        ...coupon,
      },
      usageHistory: usageOrders.map((o) => ({
        id: o._id?.toString(),
        code: o.code,
        customerName: o.customerName,
        accountCode: o.accountCode,
        gameName: o.gameName,
        amount: o.amount,
        discountAmount: o.discountAmount || 0,
        createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
      })),
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Coupon Detail Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải thông tin mã giảm giá.' },
      { status: 500 }
    );
  }
}

// PATCH - Cập nhật thông tin mã giảm giá
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID mã giảm giá không hợp lệ.' },
        { status: 400 }
      );
    }

    const couponsCol = await getCouponsCollection();
    const existing = await couponsCol.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy mã giảm giá để cập nhật.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      code,
      description,
      type,
      value,
      minOrderValue,
      maxDiscount,
      usageLimit,
      usageLimitPerUser,
      startAt,
      endAt,
      isActive,
      applicableProducts,
      applicableCategories,
      excludedProducts,
    } = body || {};

    const updateFields: Partial<CouponDocument> = {
      updatedAt: new Date(),
    };

    // 1. Cập nhật mã code
    if (code !== undefined) {
      const cleanCode = String(code).trim().toUpperCase();
      if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
        return NextResponse.json(
          { success: false, message: 'Mã giảm giá không hợp lệ.' },
          { status: 400 }
        );
      }
      if (cleanCode !== existing.code) {
        const duplicate = await couponsCol.findOne({
          code: cleanCode,
          _id: { $ne: existing._id },
        });
        if (duplicate) {
          return NextResponse.json(
            { success: false, message: `Mã "${cleanCode}" đã tồn tại.` },
            { status: 400 }
          );
        }
        updateFields.code = cleanCode;
      }
    }

    if (description !== undefined) {
      updateFields.description = String(description).trim();
    }

    if (type !== undefined) {
      if (type !== 'percentage' && type !== 'fixed') {
        return NextResponse.json(
          { success: false, message: 'Loại giảm giá không hợp lệ.' },
          { status: 400 }
        );
      }
      updateFields.type = type as CouponType;
    }

    if (value !== undefined) {
      const numVal = Number(value);
      if (isNaN(numVal) || numVal <= 0) {
        return NextResponse.json(
          { success: false, message: 'Giá trị giảm giá phải lớn hơn 0.' },
          { status: 400 }
        );
      }
      const targetType = updateFields.type || existing.type;
      if (targetType === 'percentage' && numVal > 100) {
        return NextResponse.json(
          { success: false, message: 'Phần trăm không được vượt quá 100%.' },
          { status: 400 }
        );
      }
      updateFields.value = numVal;
    }

    if (minOrderValue !== undefined) {
      updateFields.minOrderValue = Math.max(0, Number(minOrderValue) || 0);
    }

    if (maxDiscount !== undefined) {
      updateFields.maxDiscount =
        typeof maxDiscount === 'number' && maxDiscount > 0 ? maxDiscount : null;
    }

    if (usageLimit !== undefined) {
      updateFields.usageLimit =
        typeof usageLimit === 'number' && usageLimit > 0 ? usageLimit : null;
    }

    if (usageLimitPerUser !== undefined) {
      updateFields.usageLimitPerUser =
        typeof usageLimitPerUser === 'number' && usageLimitPerUser > 0
          ? usageLimitPerUser
          : null;
    }

    if (startAt !== undefined) {
      updateFields.startAt = startAt ? new Date(startAt) : null;
    }

    if (endAt !== undefined) {
      updateFields.endAt = endAt ? new Date(endAt) : null;
    }

    if (isActive !== undefined) {
      updateFields.isActive = Boolean(isActive);
    }

    if (applicableProducts !== undefined) {
      updateFields.applicableProducts = Array.isArray(applicableProducts)
        ? applicableProducts.map((p) => String(p).trim().toUpperCase()).filter(Boolean)
        : [];
    }

    if (applicableCategories !== undefined) {
      updateFields.applicableCategories = Array.isArray(applicableCategories)
        ? applicableCategories.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
        : [];
    }

    if (excludedProducts !== undefined) {
      updateFields.excludedProducts = Array.isArray(excludedProducts)
        ? excludedProducts.map((p) => String(p).trim().toUpperCase()).filter(Boolean)
        : [];
    }

    await couponsCol.updateOne(
      { _id: existing._id },
      { $set: updateFields }
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật mã giảm giá thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Coupon Update Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật mã giảm giá.' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa mã giảm giá
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID không hợp lệ.' },
        { status: 400 }
      );
    }

    const couponsCol = await getCouponsCollection();
    const result = await couponsCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy mã giảm giá để xóa.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa mã giảm giá thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Coupon Delete Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xóa mã giảm giá.' },
      { status: 500 }
    );
  }
}

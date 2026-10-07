import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getCouponsCollection } from '@/lib/db/collections';
import { CouponDocument, CouponType } from '@/types/db-coupon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Lấy danh sách mã giảm giá phân trang (Admin)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '15', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 15 : rawLimit), 100);

    const now = new Date();
    const query: Filter<CouponDocument> = {};

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ code: regex }, { description: regex }];
    }

    if (type !== 'all' && (type === 'percentage' || type === 'fixed')) {
      query.type = type as CouponType;
    }

    if (status === 'active') {
      query.isActive = true;
      query.$or = [{ endAt: null }, { endAt: { $gte: now } }];
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.endAt = { $lt: now };
    }

    const couponsCol = await getCouponsCollection();
    const [list, total] = await Promise.all([
      couponsCol
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      couponsCol.countDocuments(query),
    ]);

    const formatted = list.map((c) => {
      let currentStatus: 'active' | 'inactive' | 'expired' = c.isActive
        ? 'active'
        : 'inactive';
      if (c.endAt && now > new Date(c.endAt)) {
        currentStatus = 'expired';
      }

      return {
        id: c._id?.toString(),
        _id: c._id?.toString(),
        code: c.code,
        description: c.description || '',
        type: c.type,
        discountType: c.type,
        value: c.value,
        discountValue: c.value,
        minOrderValue: c.minOrderValue || 0,
        minOrder: c.minOrderValue || 0,
        maxDiscount: c.maxDiscount || null,
        usageLimit: c.usageLimit || null,
        usedCount: c.usedCount || 0,
        usageLimitPerUser: c.usageLimitPerUser || null,
        startAt: c.startAt ? new Date(c.startAt).toISOString() : null,
        endAt: c.endAt ? new Date(c.endAt).toISOString() : null,
        startDate: c.startAt
          ? new Date(c.startAt).toLocaleDateString('vi-VN')
          : 'Không giới hạn',
        endDate: c.endAt
          ? new Date(c.endAt).toLocaleDateString('vi-VN')
          : 'Vô thời hạn',
        isActive: c.isActive,
        status: currentStatus,
        applicableProducts: c.applicableProducts || [],
        applicableCategories: c.applicableCategories || [],
        excludedProducts: c.excludedProducts || [],
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      coupons: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Coupons GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải danh sách mã giảm giá.' },
      { status: 500 }
    );
  }
}

// POST - Tạo mã giảm giá mới (Admin)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

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
      isActive = true,
      applicableProducts,
      applicableCategories,
      excludedProducts,
    } = body || {};

    // 1. Kiểm tra mã code
    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mã giảm giá.' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã giảm giá chỉ được chứa chữ cái, số, dấu gạch ngang và từ 2-30 ký tự.',
        },
        { status: 400 }
      );
    }

    // 2. Kiểm tra trùng mã
    const couponsCol = await getCouponsCollection();
    const existing = await couponsCol.findOne({ code: cleanCode });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Mã giảm giá "${cleanCode}" đã tồn tại trên hệ thống.` },
        { status: 400 }
      );
    }

    // 3. Kiểm tra loại & giá trị giảm
    if (type !== 'percentage' && type !== 'fixed') {
      return NextResponse.json(
        { success: false, message: 'Loại giảm giá phải là "percentage" hoặc "fixed".' },
        { status: 400 }
      );
    }

    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json(
        { success: false, message: 'Giá trị giảm giá phải lớn hơn 0.' },
        { status: 400 }
      );
    }

    if (type === 'percentage' && numValue > 100) {
      return NextResponse.json(
        { success: false, message: 'Phần trăm giảm giá không được vượt quá 100%.' },
        { status: 400 }
      );
    }

    // 4. Kiểm tra điều kiện thời gian
    let parsedStartAt: Date | null = null;
    let parsedEndAt: Date | null = null;

    if (startAt) {
      parsedStartAt = new Date(startAt);
      if (isNaN(parsedStartAt.getTime())) {
        return NextResponse.json(
          { success: false, message: 'Ngày bắt đầu không hợp lệ.' },
          { status: 400 }
        );
      }
    }

    if (endAt) {
      parsedEndAt = new Date(endAt);
      if (isNaN(parsedEndAt.getTime())) {
        return NextResponse.json(
          { success: false, message: 'Ngày kết thúc không hợp lệ.' },
          { status: 400 }
        );
      }
    }

    if (parsedStartAt && parsedEndAt && parsedEndAt <= parsedStartAt) {
      return NextResponse.json(
        { success: false, message: 'Ngày kết thúc phải sau ngày bắt đầu.' },
        { status: 400 }
      );
    }

    // 5. Chuẩn bị tài liệu CouponDocument
    const newCouponDoc: CouponDocument = {
      code: cleanCode,
      description: typeof description === 'string' ? description.trim() : '',
      type: type as CouponType,
      value: numValue,
      minOrderValue: Math.max(0, Number(minOrderValue) || 0),
      maxDiscount:
        type === 'percentage' && typeof maxDiscount === 'number' && maxDiscount > 0
          ? maxDiscount
          : null,
      usageLimit:
        typeof usageLimit === 'number' && usageLimit > 0 ? usageLimit : null,
      usedCount: 0,
      usageLimitPerUser:
        typeof usageLimitPerUser === 'number' && usageLimitPerUser > 0
          ? usageLimitPerUser
          : null,
      startAt: parsedStartAt,
      endAt: parsedEndAt,
      isActive: Boolean(isActive),
      applicableProducts: Array.isArray(applicableProducts)
        ? applicableProducts.map((p) => String(p).trim().toUpperCase()).filter(Boolean)
        : [],
      applicableCategories: Array.isArray(applicableCategories)
        ? applicableCategories.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
        : [],
      excludedProducts: Array.isArray(excludedProducts)
        ? excludedProducts.map((p) => String(p).trim().toUpperCase()).filter(Boolean)
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await couponsCol.insertOne(newCouponDoc);

    return NextResponse.json({
      success: true,
      message: `Đã tạo mã giảm giá "${cleanCode}" thành công!`,
      coupon: {
        id: result.insertedId.toString(),
        ...newCouponDoc,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Coupons POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi tạo mã giảm giá.' },
      { status: 500 }
    );
  }
}

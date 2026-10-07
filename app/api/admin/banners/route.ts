import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getBannersCollection } from '@/lib/db/collections';
import { BannerDocument, BannerScheduleStatus } from '@/types/db-banner';
import { validateBannerInput } from '@/lib/banners/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Lấy danh sách banner phân trang (Admin)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100);

    const now = new Date();
    const query: Filter<BannerDocument> = {};

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ title: regex }, { subtitle: regex }, { link: regex }];
    }

    if (status === 'active') {
      query.isActive = true;
      query.$and = [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ];
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.endAt = { $lt: now };
    } else if (status === 'scheduled') {
      query.startAt = { $gt: now };
    }

    const bannersCol = await getBannersCollection();
    const [list, total] = await Promise.all([
      bannersCol
        .find(query)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      bannersCol.countDocuments(query),
    ]);

    const formatted = list.map((b) => {
      let scheduleStatus: BannerScheduleStatus = 'active';

      if (!b.isActive) {
        scheduleStatus = 'inactive';
      } else if (b.startAt && now < new Date(b.startAt)) {
        scheduleStatus = 'scheduled';
      } else if (b.endAt && now > new Date(b.endAt)) {
        scheduleStatus = 'expired';
      }

      return {
        id: b._id?.toString(),
        _id: b._id?.toString(),
        title: b.title,
        subtitle: b.subtitle || '',
        desktopImage: b.desktopImage || { url: '' },
        mobileImage: b.mobileImage || undefined,
        imageUrl: b.desktopImage?.url || '',
        buttonText: b.buttonText || 'Xem Ngay',
        ctaText: b.buttonText || 'Xem Ngay',
        link: b.link || '',
        openInNewTab: Boolean(b.openInNewTab),
        sortOrder: b.sortOrder || 1,
        isActive: Boolean(b.isActive),
        status: scheduleStatus,
        scheduleStatus,
        clickCount: b.clickCount || 0,
        startAt: b.startAt ? new Date(b.startAt).toISOString() : null,
        endAt: b.endAt ? new Date(b.endAt).toISOString() : null,
        startDate: b.startAt
          ? new Date(b.startAt).toLocaleString('vi-VN')
          : 'Không giới hạn',
        endDate: b.endAt
          ? new Date(b.endAt).toLocaleString('vi-VN')
          : 'Vô thời hạn',
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      banners: formatted,
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
    console.error('[API Admin Banners GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải danh sách banner.' },
      { status: 500 }
    );
  }
}

// POST - Tạo banner mới (Admin)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = validateBannerInput(body);

    if (!validation.isValid || !validation.sanitized) {
      const firstError = Object.values(validation.errors)[0] || 'Dữ liệu banner không hợp lệ.';
      return NextResponse.json(
        {
          success: false,
          message: firstError,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const {
      title,
      subtitle,
      desktopImage,
      mobileImage,
      buttonText,
      link,
      openInNewTab,
      sortOrder,
      isActive,
      startAt,
      endAt,
    } = validation.sanitized;

    const newBannerDoc: BannerDocument = {
      title,
      subtitle,
      desktopImage,
      ...(mobileImage ? { mobileImage } : {}),
      buttonText,
      link,
      openInNewTab,
      sortOrder,
      isActive,
      startAt,
      endAt,
      clickCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bannersCol = await getBannersCollection();
    const result = await bannersCol.insertOne(newBannerDoc);

    return NextResponse.json({
      success: true,
      message: `Đã tạo banner "${title}" thành công!`,
      banner: {
        id: result.insertedId.toString(),
        ...newBannerDoc,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Banners POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi tạo banner.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getBannersCollection } from '@/lib/db/collections';
import { BannerDocument } from '@/types/db-banner';
import { validateBannerInput } from '@/lib/banners/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Chi tiết banner
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID banner không hợp lệ.' },
        { status: 400 }
      );
    }

    const bannersCol = await getBannersCollection();
    const banner = await bannersCol.findOne({ _id: new ObjectId(id) });

    if (!banner) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy banner.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      banner: {
        id: banner._id?.toString(),
        _id: banner._id?.toString(),
        title: banner.title,
        subtitle: banner.subtitle || '',
        desktopImage: banner.desktopImage,
        mobileImage: banner.mobileImage,
        imageUrl: banner.desktopImage?.url || '',
        buttonText: banner.buttonText || 'Xem Ngay',
        ctaText: banner.buttonText || 'Xem Ngay',
        link: banner.link || '',
        openInNewTab: Boolean(banner.openInNewTab),
        sortOrder: banner.sortOrder || 1,
        isActive: Boolean(banner.isActive),
        clickCount: banner.clickCount || 0,
        startAt: banner.startAt ? new Date(banner.startAt).toISOString() : null,
        endAt: banner.endAt ? new Date(banner.endAt).toISOString() : null,
        createdAt: banner.createdAt ? new Date(banner.createdAt).toISOString() : '',
        updatedAt: banner.updatedAt ? new Date(banner.updatedAt).toISOString() : '',
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Banner Detail Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải thông tin banner.' },
      { status: 500 }
    );
  }
}

// PATCH - Cập nhật thông tin banner
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID banner không hợp lệ.' },
        { status: 400 }
      );
    }

    const bannersCol = await getBannersCollection();
    const existing = await bannersCol.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy banner để cập nhật.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateBannerInput({
      ...existing,
      ...body,
    });

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

    const updateFields: Partial<BannerDocument> = {
      title,
      subtitle,
      desktopImage,
      mobileImage: mobileImage || undefined,
      buttonText,
      link,
      openInNewTab,
      sortOrder,
      isActive,
      startAt,
      endAt,
      updatedAt: new Date(),
    };

    await bannersCol.updateOne(
      { _id: existing._id },
      { $set: updateFields }
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật banner thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Banner Update Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật banner.' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa banner
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

    const bannersCol = await getBannersCollection();
    const result = await bannersCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy banner để xóa.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa banner thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Banner Delete Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xóa banner.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/server';
import { getBannersCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Bật/tắt nhanh trạng thái hiển thị banner
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

    const body = await request.json();
    const { isActive } = body || {};

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Giá trị trạng thái isActive phải là boolean.' },
        { status: 400 }
      );
    }

    const bannersCol = await getBannersCollection();
    const result = await bannersCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy banner.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isActive ? 'Đã kích hoạt hiển thị banner!' : 'Đã tắt hiển thị banner!',
      isActive,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên.' },
        { status: 403 }
      );
    }
    console.error('[API Admin Banner Status Toggle Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật trạng thái banner.' },
      { status: 500 }
    );
  }
}

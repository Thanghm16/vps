import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth/server';
import { getFavoritesCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Xóa sản phẩm khỏi danh sách yêu thích của user hiện tại
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { success: false, message: 'Mã hoặc ID sản phẩm không hợp lệ.' },
        { status: 400 }
      );
    }

    const cleanId = id.trim();
    const userObjectId = new ObjectId(user.id);
    const favoritesCol = await getFavoritesCollection();

    const orConditions: any[] = [
      { accountCode: { $regex: `^${cleanId}$`, $options: 'i' } },
    ];

    if (ObjectId.isValid(cleanId)) {
      orConditions.push({ accountId: new ObjectId(cleanId) });
      orConditions.push({ _id: new ObjectId(cleanId) });
    }

    await favoritesCol.deleteMany({
      userId: userObjectId,
      $or: orConditions,
    });

    return NextResponse.json({
      success: true,
      isFavorite: false,
      message: 'Đã bỏ khỏi danh sách yêu thích.',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để thực hiện.' },
        { status: 401 }
      );
    }
    console.error('[API Favorites DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xóa khỏi danh sách yêu thích.' },
      { status: 500 }
    );
  }
}

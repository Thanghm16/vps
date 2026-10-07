import { NextResponse } from 'next/server';
import { ObjectId, Filter } from 'mongodb';
import { getAccountsCollection, getGamesCollection } from '@/lib/db/collections';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { encryptCredentials } from '@/lib/crypto/encryption';
import { GameAccountDocument } from '@/types/db-account';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    const accounts = await getAccountsCollection();

    let query: Filter<GameAccountDocument>;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { code: id };
    }

    const currentDoc = await accounts.findOne(query);
    if (!currentDoc) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản game.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      'title',
      'price',
      'originalPrice',
      'status',
      'thumbnail',
      'images',
      'tags',
      'highlights',
      'description',
      'isVerified',
      'isFeatured',
      'isHot',
      'details',
      'gameSlug',
      'gameName',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Mã hoá thông tin credentials nếu có cập nhật
    if (body.credentials !== undefined) {
      updateData.credentials =
        typeof body.credentials === 'object' && body.credentials !== null
          ? encryptCredentials(body.credentials)
          : undefined;
    }

    // Tự động tính lại % giảm giá nếu giá thay đổi
    if (typeof updateData.price === 'number' && typeof updateData.originalPrice === 'number') {
      const p = updateData.price;
      const op = updateData.originalPrice;
      updateData.discountPercent = op > p ? Math.round(((op - p) / op) * 100) : 0;
    }

    await accounts.updateOne(query, { $set: updateData });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin nick thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[API Update Account Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi cập nhật.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const { id } = await params;
    const accounts = await getAccountsCollection();

    let query: Filter<GameAccountDocument>;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { code: id };
    }

    const doc = await accounts.findOne(query);
    if (!doc) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nick để xóa.' }, { status: 404 });
    }

    await accounts.deleteOne(query);

    // Giảm số lượng tài khoản trong danh mục game tương ứng
    try {
      const games = await getGamesCollection();
      await games.updateOne(
        { slug: doc.gameSlug },
        { $inc: { accountsCount: -1 } }
      );
    } catch (e) {
      console.warn('Game count decrement failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa nick khỏi kho thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi xóa.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { ObjectId, Filter } from 'mongodb';
import { getGamesCollection } from '@/lib/db/collections';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { GameCategoryDocument } from '@/types/db-account';
import { slugify } from '@/lib/utils';

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
    const { name, slug } = body || {};

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (name && typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }

    // Nếu có slug riêng hoặc có đổi name mà không truyền slug, tự tạo slug trên server
    if (slug && typeof slug === 'string' && slug.trim()) {
      updateFields.slug = slugify(slug);
    } else if (name && typeof name === 'string' && name.trim()) {
      updateFields.slug = slugify(name);
    }

    const games = await getGamesCollection();

    let query: Filter<GameCategoryDocument>;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { slug: id };
    }

    // Nếu slug thay đổi, kiểm tra trùng lặp với các game khác
    if (updateFields.slug) {
      let objectId: ObjectId | null = null;
      try {
        objectId = new ObjectId(id);
      } catch {
        objectId = null;
      }

      const existing = await games.findOne({
        slug: updateFields.slug as string,
        ...(objectId ? { _id: { $ne: objectId } } : { slug: { $ne: id } }),
      });
      if (existing) {
        updateFields.slug = `${updateFields.slug}-${Date.now().toString(36).substring(4)}`;
      }
    }

    const result = await games.updateOne(query, { $set: updateFields });
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy danh mục game.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật danh mục game thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ.' }, { status: 500 });
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
    const games = await getGamesCollection();

    let query: Filter<GameCategoryDocument>;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { slug: id };
    }

    const result = await games.deleteOne(query);
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy game cần xóa.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa danh mục game thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ.' }, { status: 500 });
  }
}

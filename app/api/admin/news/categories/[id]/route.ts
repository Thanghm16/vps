import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCategoriesCollection, getNewsCollection } from '@/lib/db/collections';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';

// PATCH: Cập nhật danh mục tin tức (Admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    await requireAdmin();

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID danh mục không hợp lệ.' }, { status: 400 });
    }

    const body = await request.json();
    const categoriesColl = await getNewsCategoriesCollection();
    const existing = await categoriesColl.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy danh mục tin tức.' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ success: false, message: 'Tên danh mục không được để trống.' }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.slug !== undefined) {
      const newSlug = slugify(String(body.slug).trim() || updates.name || existing.name);
      if (!newSlug) {
        return NextResponse.json({ success: false, message: 'Slug không hợp lệ.' }, { status: 400 });
      }
      // Kiểm tra trùng slug với category khác
      const duplicate = await categoriesColl.findOne({
        slug: newSlug,
        _id: { $ne: new ObjectId(id) },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, message: `Slug "${newSlug}" đã được sử dụng.` }, { status: 400 });
      }
      updates.slug = newSlug;
    }

    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.image !== undefined) updates.image = String(body.image).trim();
    if (body.status !== undefined) updates.status = body.status === 'inactive' ? 'inactive' : 'active';
    if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder) || 0;
    if (body.metaTitle !== undefined) updates.metaTitle = String(body.metaTitle).trim();
    if (body.metaDescription !== undefined) updates.metaDescription = String(body.metaDescription).trim();

    await categoriesColl.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    // Cập nhật tên/slug cache trong các bài viết nếu có thay đổi
    if (updates.name || updates.slug) {
      const newsColl = await getNewsCollection();
      const newsUpdates: Record<string, any> = {};
      if (updates.name) newsUpdates.categoryName = updates.name;
      if (updates.slug) newsUpdates.categorySlug = updates.slug;

      await newsColl.updateMany(
        { categoryId: new ObjectId(id) },
        { $set: newsUpdates }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật danh mục tin tức thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Category PATCH Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi cập nhật danh mục tin tức.' }, { status: 500 });
  }
}

// DELETE: Xóa danh mục tin tức (Admin - Kiểm tra ràng buộc bài viết)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    await requireAdmin();

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID danh mục không hợp lệ.' }, { status: 400 });
    }

    const categoriesColl = await getNewsCategoriesCollection();
    const newsColl = await getNewsCollection();

    const category = await categoriesColl.findOne({ _id: new ObjectId(id) });
    if (!category) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy danh mục để xóa.' }, { status: 404 });
    }

    // KIỂM TRA: Không cho xóa nếu đang có bài viết sử dụng category đó
    const linkedNewsCount = await newsColl.countDocuments({
      $or: [
        { categoryId: new ObjectId(id) },
        { categorySlug: category.slug },
      ],
    });

    if (linkedNewsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa danh mục này vì đang có ${linkedNewsCount} bài viết trực thuộc. Vui lòng chuyển các bài viết sang danh mục khác trước!`,
        },
        { status: 400 }
      );
    }

    await categoriesColl.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Xóa danh mục tin tức thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Category DELETE Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi xóa danh mục tin tức.' }, { status: 500 });
  }
}

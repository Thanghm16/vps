import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCollection, getNewsCategoriesCollection } from '@/lib/db/collections';
import { slugify } from '@/lib/utils';
import { sanitizeHtmlContent } from '@/lib/security/html-sanitizer';
import { NewsStatus } from '@/types/db-news';

export const runtime = 'nodejs';

// GET: Lấy chi tiết bài viết theo ID để chỉnh sửa (Admin)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID bài viết không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const article = await newsColl.findOne({ _id: new ObjectId(id) });

    if (!article) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài viết.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      article: {
        id: article._id?.toString(),
        _id: article._id?.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || '',
        content: article.content || '',
        thumbnail: article.thumbnail || '',
        images: article.images || [],
        categoryId: article.categoryId ? article.categoryId.toString() : '',
        categorySlug: article.categorySlug || '',
        categoryName: article.categoryName || 'Chung',
        tags: article.tags || [],
        author: article.author || { id: '', name: 'Admin', username: 'admin' },
        status: article.status || 'draft',
        isFeatured: !!article.isFeatured,
        isPinned: !!article.isPinned,
        views: article.views || 0,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
        scheduledAt: article.scheduledAt ? article.scheduledAt.toISOString() : null,
        metaTitle: article.metaTitle || '',
        metaDescription: article.metaDescription || '',
        metaKeywords: article.metaKeywords || '',
        canonicalUrl: article.canonicalUrl || '',
        robots: article.robots || 'index, follow',
        createdAt: article.createdAt ? article.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: article.updatedAt ? article.updatedAt.toISOString() : new Date().toISOString(),
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News GET By ID Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi tải bài viết.' }, { status: 500 });
  }
}

// PATCH: Cập nhật bài viết tin tức (Admin)
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
      return NextResponse.json({ success: false, message: 'ID bài viết không hợp lệ.' }, { status: 400 });
    }

    const body = await request.json();
    const newsColl = await getNewsCollection();
    const categoriesColl = await getNewsCategoriesCollection();

    const existing = await newsColl.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài viết để cập nhật.' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        return NextResponse.json({ success: false, message: 'Tiêu đề không được để trống.' }, { status: 400 });
      }
      updates.title = title;
    }

    // Slug update
    if (body.slug !== undefined) {
      const customSlug = slugify(String(body.slug).trim() || updates.title || existing.title);
      if (!customSlug) {
        return NextResponse.json({ success: false, message: 'Slug không hợp lệ.' }, { status: 400 });
      }

      // Check duplicate slug
      const duplicate = await newsColl.findOne({
        slug: customSlug,
        _id: { $ne: new ObjectId(id) },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Slug "${customSlug}" đã được sử dụng bởi bài viết khác.` },
          { status: 400 }
        );
      }
      updates.slug = customSlug;
    }

    if (body.excerpt !== undefined) updates.excerpt = String(body.excerpt).trim();

    if (body.content !== undefined) {
      const rawContent = String(body.content).trim();
      if (!rawContent) {
        return NextResponse.json({ success: false, message: 'Nội dung bài viết không được để trống.' }, { status: 400 });
      }
      updates.content = sanitizeHtmlContent(rawContent);
    }

    if (body.thumbnail !== undefined) updates.thumbnail = String(body.thumbnail).trim();
    if (body.images !== undefined) updates.images = Array.isArray(body.images) ? body.images.map(String) : [];

    // Category update
    if (body.categoryId !== undefined) {
      const catIdStr = String(body.categoryId).trim();
      if (catIdStr && ObjectId.isValid(catIdStr)) {
        updates.categoryId = new ObjectId(catIdStr);
        const catDoc = await categoriesColl.findOne({ _id: updates.categoryId });
        if (catDoc) {
          updates.categorySlug = catDoc.slug;
          updates.categoryName = catDoc.name;
        }
      } else {
        updates.categoryId = null;
        updates.categorySlug = '';
        updates.categoryName = 'Chung';
      }
    }

    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags)
        ? body.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof body.tags === 'string'
        ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];
    }

    if (body.status !== undefined) {
      const status = (['draft', 'published', 'scheduled', 'archived'].includes(body.status)
        ? body.status
        : existing.status) as NewsStatus;
      updates.status = status;

      if (status === 'published' && !existing.publishedAt && !body.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.isPinned !== undefined) updates.isPinned = Boolean(body.isPinned);

    if (body.publishedAt !== undefined) {
      updates.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    }
    if (body.scheduledAt !== undefined) {
      updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    if (body.metaTitle !== undefined) updates.metaTitle = String(body.metaTitle).trim();
    if (body.metaDescription !== undefined) updates.metaDescription = String(body.metaDescription).trim();
    if (body.metaKeywords !== undefined) updates.metaKeywords = body.metaKeywords;
    if (body.canonicalUrl !== undefined) updates.canonicalUrl = String(body.canonicalUrl).trim();
    if (body.robots !== undefined) updates.robots = String(body.robots).trim();

    await newsColl.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật bài viết tin tức thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News PATCH Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi cập nhật bài viết.' }, { status: 500 });
  }
}

// DELETE: Xóa bài viết tin tức (Admin)
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
      return NextResponse.json({ success: false, message: 'ID bài viết không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const result = await newsColl.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài viết để xóa.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa bài viết tin tức thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News DELETE Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi xóa bài viết.' }, { status: 500 });
  }
}

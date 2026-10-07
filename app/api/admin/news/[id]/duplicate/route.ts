import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCollection } from '@/lib/db/collections';
import { slugify } from '@/lib/utils';
import { NewsDocument } from '@/types/db-news';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    const adminUser = await requireAdmin();

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID bài viết không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const original = await newsColl.findOne({ _id: new ObjectId(id) });
    if (!original) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài viết gốc để nhân bản.' }, { status: 404 });
    }

    // Tạo unique slug mới
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newSlug = slugify(`${original.slug}-ban-sao-${randomSuffix}`);
    const newTitle = `${original.title} (Bản sao)`;
    const now = new Date();

    const duplicatedDoc: NewsDocument = {
      title: newTitle,
      slug: newSlug,
      excerpt: original.excerpt || '',
      content: original.content || '',
      thumbnail: original.thumbnail || '',
      images: original.images || [],
      categoryId: original.categoryId,
      categorySlug: original.categorySlug || '',
      categoryName: original.categoryName || 'Chung',
      tags: original.tags || [],
      author: {
        id: adminUser.id,
        name: adminUser.username || 'Admin',
        username: adminUser.username,
        avatar: adminUser.avatar,
        role: adminUser.role,
      },
      status: 'draft',
      isFeatured: false,
      isPinned: false,
      views: 0,
      publishedAt: null,
      scheduledAt: null,
      metaTitle: original.metaTitle ? `${original.metaTitle} (Bản sao)` : newTitle,
      metaDescription: original.metaDescription || '',
      metaKeywords: original.metaKeywords || '',
      canonicalUrl: '',
      robots: 'index, follow',
      createdAt: now,
      updatedAt: now,
    };

    const result = await newsColl.insertOne(duplicatedDoc);

    return NextResponse.json({
      success: true,
      message: 'Nhân bản bài viết thành công!',
      id: result.insertedId.toString(),
      slug: newSlug,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Duplicate Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi nhân bản bài viết.' }, { status: 500 });
  }
}

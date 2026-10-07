import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCollection, getNewsCategoriesCollection } from '@/lib/db/collections';
import { slugify } from '@/lib/utils';
import { sanitizeHtmlContent } from '@/lib/security/html-sanitizer';
import { NewsDocument, NewsStatus } from '@/types/db-news';

export const runtime = 'nodejs';

// GET: Danh sách bài viết tin tức phân trang cho Admin
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';
    const featured = searchParams.get('featured') || 'all';
    const pinned = searchParams.get('pinned') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const query: Record<string, any> = {};

    // 1. Tìm kiếm theo title, slug, tags
    if (search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { slug: { $regex: term, $options: 'i' } },
        { tags: { $in: [new RegExp(term, 'i')] } },
      ];
    }

    // 2. Lọc theo trạng thái
    if (status !== 'all') {
      query.status = status;
    }

    // 3. Lọc theo danh mục
    if (category !== 'all') {
      if (ObjectId.isValid(category)) {
        query.$or = [{ categoryId: new ObjectId(category) }, { categorySlug: category }];
      } else {
        query.categorySlug = category;
      }
    }

    // 4. Lọc Featured & Pinned
    if (featured === 'true') query.isFeatured = true;
    if (featured === 'false') query.isFeatured = false;
    if (pinned === 'true') query.isPinned = true;
    if (pinned === 'false') query.isPinned = false;

    // 5. Sắp xếp
    const sortObj: Record<string, 1 | -1> = {};
    if (sortBy === 'views') sortObj.views = sortOrder;
    else if (sortBy === 'publishedAt') sortObj.publishedAt = sortOrder;
    else if (sortBy === 'title') sortObj.title = sortOrder;
    else sortObj.createdAt = sortOrder;

    const newsColl = await getNewsCollection();

    const [total, newsList] = await Promise.all([
      newsColl.countDocuments(query),
      newsColl
        .find(query, {
          projection: {
            content: 0, // Không fetch content HTML dài để tối ưu băng thông danh sách
          },
        })
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    const formattedList = newsList.map((item) => ({
      id: item._id?.toString(),
      _id: item._id?.toString(),
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      thumbnail: item.thumbnail || '',
      images: item.images || [],
      categoryId: item.categoryId ? item.categoryId.toString() : '',
      categorySlug: item.categorySlug || '',
      categoryName: item.categoryName || 'Chung',
      tags: item.tags || [],
      author: item.author || { id: '', name: 'Admin', username: 'admin' },
      status: item.status || 'draft',
      isFeatured: !!item.isFeatured,
      isPinned: !!item.isPinned,
      views: item.views || 0,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
      scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : null,
      metaTitle: item.metaTitle || '',
      metaDescription: item.metaDescription || '',
      createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      news: formattedList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách tin tức.' }, { status: 500 });
  }
}

// POST: Tạo bài viết tin tức mới (Admin)
export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    const adminUser = await requireAdmin();

    const body = await request.json();
    const title = String(body.title || '').trim();
    let customSlug = String(body.slug || '').trim();
    const excerpt = String(body.excerpt || '').trim();
    const rawContent = String(body.content || '').trim();
    const thumbnail = String(body.thumbnail || '').trim();
    const images = Array.isArray(body.images) ? body.images.map(String) : [];
    const categoryIdStr = String(body.categoryId || '').trim();
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : typeof body.tags === 'string'
      ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
    const status = (['draft', 'published', 'scheduled', 'archived'].includes(body.status)
      ? body.status
      : 'draft') as NewsStatus;
    const isFeatured = Boolean(body.isFeatured);
    const isPinned = Boolean(body.isPinned);

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    let publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;

    if (status === 'published' && !publishedAt) {
      publishedAt = new Date();
    }
    if (status === 'scheduled' && !scheduledAt) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng chọn thời gian đăng bài khi trạng thái là Lên lịch (Scheduled).' },
        { status: 400 }
      );
    }

    const metaTitle = String(body.metaTitle || '').trim();
    const metaDescription = String(body.metaDescription || '').trim();
    const metaKeywords = body.metaKeywords || '';
    const canonicalUrl = String(body.canonicalUrl || '').trim();
    const robots = String(body.robots || 'index, follow').trim();

    if (!title) {
      return NextResponse.json({ success: false, message: 'Tiêu đề bài viết là bắt buộc.' }, { status: 400 });
    }
    if (!rawContent) {
      return NextResponse.json({ success: false, message: 'Nội dung bài viết là bắt buộc.' }, { status: 400 });
    }

    // Tạo & kiểm tra tính hợp lệ của Slug
    const finalSlug = slugify(customSlug || title);
    if (!finalSlug) {
      return NextResponse.json({ success: false, message: 'Slug bài viết không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const categoriesColl = await getNewsCategoriesCollection();

    // Kiểm tra duplicate slug
    const existing = await newsColl.findOne({ slug: finalSlug });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Slug "${finalSlug}" đã tồn tại. Vui lòng chỉnh sửa slug thủ công!` },
        { status: 400 }
      );
    }

    // Tra cứu thông tin Category nếu có
    let categoryObjId: ObjectId | undefined = undefined;
    let categorySlug = '';
    let categoryName = 'Chung';

    if (categoryIdStr && ObjectId.isValid(categoryIdStr)) {
      categoryObjId = new ObjectId(categoryIdStr);
      const catDoc = await categoriesColl.findOne({ _id: categoryObjId });
      if (catDoc) {
        categorySlug = catDoc.slug;
        categoryName = catDoc.name;
      }
    }

    // Sanitize HTML an toàn tuyệt đối
    const sanitizedContent = sanitizeHtmlContent(rawContent);

    const now = new Date();
    const newDoc: NewsDocument = {
      title,
      slug: finalSlug,
      excerpt: excerpt || title,
      content: sanitizedContent,
      thumbnail,
      images,
      categoryId: categoryObjId,
      categorySlug,
      categoryName,
      tags,
      author: {
        id: adminUser.id,
        name: adminUser.username || 'Admin',
        username: adminUser.username,
        avatar: adminUser.avatar,
        role: adminUser.role,
      },
      status,
      isFeatured,
      isPinned,
      views: 0,
      publishedAt,
      scheduledAt,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || title,
      metaKeywords,
      canonicalUrl,
      robots,
      createdAt: now,
      updatedAt: now,
    };

    const result = await newsColl.insertOne(newDoc);

    return NextResponse.json({
      success: true,
      message: 'Tạo bài viết tin tức mới thành công!',
      id: result.insertedId.toString(),
      slug: finalSlug,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Create Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi tạo bài viết tin tức: ' + (error as Error).message }, { status: 500 });
  }
}

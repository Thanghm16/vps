import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getNewsCollection, getNewsCategoriesCollection } from '@/lib/db/collections';
import { calculateReadingTime } from '@/lib/security/html-sanitizer';

export const runtime = 'nodejs';

// GET: Danh sách tin tức công khai cho người dùng (Public Storefront)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const category = searchParams.get('category') || 'all';
    const tag = searchParams.get('tag') || '';
    const featured = searchParams.get('featured') || 'all';
    const sortBy = searchParams.get('sortBy') || 'newest';

    const now = new Date();

    // Điều kiện PUBLIC:
    // 1. status = 'published' và (publishedAt <= now)
    // 2. HOẶC status = 'scheduled' nhưng scheduledAt <= now (đã đến giờ đăng)
    const publicCondition: Record<string, any> = {
      $or: [
        {
          status: 'published',
          $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
        },
        {
          status: 'scheduled',
          scheduledAt: { $lte: now },
        },
      ],
    };

    const query: Record<string, any> = {
      ...publicCondition,
    };

    // Tìm kiếm theo từ khóa
    if (search.trim()) {
      const term = search.trim();
      query.$and = [
        publicCondition,
        {
          $or: [
            { title: { $regex: term, $options: 'i' } },
            { excerpt: { $regex: term, $options: 'i' } },
            { slug: { $regex: term, $options: 'i' } },
            { tags: { $in: [new RegExp(term, 'i')] } },
          ],
        },
      ];
      delete query.$or;
    }

    // Lọc theo chuyên mục
    if (category && category !== 'all') {
      if (ObjectId.isValid(category)) {
        query.categoryId = new ObjectId(category);
      } else {
        query.categorySlug = category;
      }
    }

    // Lọc theo tag
    if (tag.trim()) {
      query.tags = { $in: [new RegExp(`^${tag.trim()}$`, 'i')] };
    }

    // Lọc bài viết nổi bật
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Sắp xếp
    const sortObj: Record<string, 1 | -1> = {
      isPinned: -1, // Luôn ưu tiên bài được ghim
    };

    if (sortBy === 'views') {
      sortObj.views = -1;
      sortObj.publishedAt = -1;
    } else if (sortBy === 'popular') {
      sortObj.views = -1;
      sortObj.isFeatured = -1;
    } else {
      // Mới nhất
      sortObj.publishedAt = -1;
      sortObj.createdAt = -1;
    }

    const newsColl = await getNewsCollection();

    const [total, rawList] = await Promise.all([
      newsColl.countDocuments(query),
      newsColl
        .find(query, {
          projection: {
            content: 0, // Không lấy content HTML đầy đủ trong list API
          },
        })
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    const articles = rawList.map((item) => ({
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
      author: item.author || { id: '', name: 'Ban Biên Tập', username: 'editor' },
      isFeatured: !!item.isFeatured,
      isPinned: !!item.isPinned,
      views: item.views || 0,
      readingTime: calculateReadingTime(item.excerpt || item.title),
      publishedAt: item.publishedAt
        ? item.publishedAt.toISOString()
        : item.createdAt
        ? item.createdAt.toISOString()
        : new Date().toISOString(),
      createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      metaTitle: item.metaTitle || item.title,
      metaDescription: item.metaDescription || item.excerpt,
    }));

    return NextResponse.json(
      {
        success: true,
        articles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[Public News GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải danh sách tin tức.' }, { status: 500 });
  }
}

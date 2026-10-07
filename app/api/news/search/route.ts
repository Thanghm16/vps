import { NextResponse } from 'next/server';
import { getNewsCollection } from '@/lib/db/collections';
import { calculateReadingTime } from '@/lib/security/html-sanitizer';
import { Filter } from 'mongodb';
import { NewsDocument } from '@/types/db-news';

export const runtime = 'nodejs';

// GET: Tìm kiếm bài viết nhanh công khai
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));

    if (!q) {
      return NextResponse.json({ success: true, articles: [], total: 0 });
    }

    const now = new Date();
    const query: Filter<NewsDocument> = {
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
      $and: [
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { excerpt: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i') as any] } },
          ],
        },
      ],
    };

    const newsColl = await getNewsCollection();
    const list = await newsColl
      .find(query, {
        projection: { content: 0 },
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    const articles = list.map((item) => ({
      id: item._id?.toString(),
      _id: item._id?.toString(),
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      thumbnail: item.thumbnail || '',
      categoryName: item.categoryName || 'Chung',
      categorySlug: item.categorySlug || '',
      views: item.views || 0,
      readingTime: calculateReadingTime(item.excerpt || item.title),
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
    });
  } catch (error) {
    console.error('[Public News Search Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tìm kiếm bài viết.' }, { status: 500 });
  }
}

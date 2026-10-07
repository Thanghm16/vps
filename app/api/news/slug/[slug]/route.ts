import { NextResponse } from 'next/server';
import { getNewsCollection } from '@/lib/db/collections';
import { calculateReadingTime } from '@/lib/security/html-sanitizer';
import { Filter } from 'mongodb';
import { NewsDocument } from '@/types/db-news';

export const runtime = 'nodejs';

// GET: Chi tiết bài viết theo Slug công khai kèm bài liên quan và bài trước/sau
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Slug không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const now = new Date();

    const publicCondition: Filter<NewsDocument> = {
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

    // Tìm bài viết chính
    const article = await newsColl.findOne({
      slug,
      ...publicCondition,
    });

    if (!article) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài viết hoặc bài viết chưa được xuất bản.' }, { status: 404 });
    }

    const currentPublishedAt = article.publishedAt || article.createdAt;

    // Tìm bài viết liên quan (Ưu tiên cùng danh mục hoặc cùng tags, không trùng bài hiện tại)
    const relatedQuery: Filter<NewsDocument> = {
      _id: { $ne: article._id },
      ...publicCondition,
    };

    if (article.categoryId) {
      relatedQuery.$or = [
        { categoryId: article.categoryId },
        { categorySlug: article.categorySlug },
        { tags: { $in: article.tags || [] } },
      ];
    } else if (article.tags && article.tags.length > 0) {
      relatedQuery.tags = { $in: article.tags };
    }

    const prevFilter: Filter<NewsDocument> = {
      _id: { $ne: article._id },
      ...publicCondition,
      publishedAt: { $lt: currentPublishedAt },
    };

    const nextFilter: Filter<NewsDocument> = {
      _id: { $ne: article._id },
      ...publicCondition,
      publishedAt: { $gt: currentPublishedAt },
    };

    const [relatedArticles, previousArticle, nextArticle] = await Promise.all([
      newsColl
        .find(relatedQuery, { projection: { content: 0 } })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(4)
        .toArray(),

      // Bài viết trước đó
      newsColl.findOne(prevFilter, {
        projection: { title: 1, slug: 1, thumbnail: 1, publishedAt: 1 },
        sort: { publishedAt: -1 },
      }),

      // Bài viết tiếp theo
      newsColl.findOne(nextFilter, {
        projection: { title: 1, slug: 1, thumbnail: 1, publishedAt: 1 },
        sort: { publishedAt: 1 },
      }),
    ]);

    const formattedArticle = {
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
      author: article.author || { id: '', name: 'Ban Biên Tập', username: 'editor' },
      views: article.views || 0,
      readingTime: calculateReadingTime(article.content || article.excerpt || article.title),
      metaTitle: article.metaTitle || article.title,
      metaDescription: article.metaDescription || article.excerpt,
      metaKeywords: article.metaKeywords || '',
      canonicalUrl: article.canonicalUrl || '',
      robots: article.robots || 'index, follow',
      publishedAt: article.publishedAt
        ? article.publishedAt.toISOString()
        : article.createdAt.toISOString(),
      createdAt: article.createdAt ? article.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: article.updatedAt ? article.updatedAt.toISOString() : new Date().toISOString(),
    };

    const formattedRelated = relatedArticles.map((item) => ({
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
      article: formattedArticle,
      related: formattedRelated,
      previous: previousArticle
        ? {
            title: previousArticle.title,
            slug: previousArticle.slug,
            thumbnail: previousArticle.thumbnail || '',
          }
        : null,
      next: nextArticle
        ? {
            title: nextArticle.title,
            slug: nextArticle.slug,
            thumbnail: nextArticle.thumbnail || '',
          }
        : null,
    });
  } catch (error) {
    console.error('[Public News Detail GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải chi tiết bài viết.' }, { status: 500 });
  }
}

import { getNewsCategoriesCollection, getNewsCollection } from './collections';
import { NewsClientData, NewsCategoryClientData, NewsDocument } from '@/types/db-news';

export interface NewsInitialData {
  categories: NewsCategoryClientData[];
  featuredArticles: NewsClientData[];
  initialArticles: NewsClientData[];
  totalArticles: number;
  totalPages: number;
}

/**
 * Lấy dữ liệu khởi tạo cho trang Tin Tức trực tiếp từ MongoDB trên Server
 */
export async function getNewsInitialData(): Promise<NewsInitialData> {
  try {
    const [categoriesCol, newsCol] = await Promise.all([
      getNewsCategoriesCollection(),
      getNewsCollection(),
    ]);

    const now = new Date();
    const publicFilter = {
      $or: [
        { status: 'published' as const },
        { status: 'scheduled' as const, scheduledAt: { $lte: now } },
      ],
    };

    // 1. Lấy danh mục và tính số lượng bài viết bằng aggregation
    const [rawCategories, categoryCounts] = await Promise.all([
      categoriesCol.find({ status: 'active' }).sort({ sortOrder: 1, name: 1 }).toArray(),
      newsCol
        .aggregate<{ _id: string; count: number }>([
          { $match: publicFilter },
          { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const countMap = new Map<string, number>(
      categoryCounts.map((c) => [String(c._id), c.count])
    );

    const categories: NewsCategoryClientData[] = rawCategories.map((cat) => ({
      id: cat._id?.toString() || '',
      _id: cat._id?.toString() || '',
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      sortOrder: cat.sortOrder || 0,
      status: cat.status,
      metaTitle: cat.metaTitle,
      metaDescription: cat.metaDescription,
      articlesCount: countMap.get(cat._id?.toString() || '') || 0,
      createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: cat.updatedAt ? new Date(cat.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // 2. Lấy bài viết Featured và danh sách bài viết trang 1 (loại bỏ trường content HTML lớn)
    const [featuredDocs, initialDocs, totalCount] = await Promise.all([
      newsCol
        .find(
          { ...publicFilter, isFeatured: true },
          { projection: { content: 0 } }
        )
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
        .limit(3)
        .toArray(),

      newsCol
        .find(publicFilter, { projection: { content: 0 } })
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
        .limit(12)
        .toArray(),

      newsCol.countDocuments(publicFilter),
    ]);

    const formatDoc = (doc: NewsDocument): NewsClientData => ({
      id: doc._id?.toString() || '',
      _id: doc._id?.toString() || '',
      title: doc.title,
      slug: doc.slug,
      excerpt: doc.excerpt || '',
      thumbnail: doc.thumbnail || '/placeholder-game.jpg',
      images: doc.images || [],
      categoryId: doc.categoryId?.toString() || '',
      categoryName: doc.categoryName || 'Tin tức',
      categorySlug: doc.categorySlug || 'tin-tuc',
      tags: doc.tags || [],
      author: doc.author || { id: '', name: 'Ban Biên Tập', username: 'editor' },
      status: doc.status,
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
      scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : null,
      isFeatured: Boolean(doc.isFeatured),
      isPinned: Boolean(doc.isPinned),
      views: doc.views || 0,
      readingTime: 3,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    });

    const featuredArticles = featuredDocs.map(formatDoc);
    const initialArticles = initialDocs.map(formatDoc);
    const pageSize = 12;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      categories,
      featuredArticles,
      initialArticles,
      totalArticles: totalCount,
      totalPages,
    };
  } catch (err) {
    console.warn('[NewsInitialData] Could not fetch live news data from DB, using fallback defaults:', err);
    return {
      categories: [],
      featuredArticles: [],
      initialArticles: [],
      totalArticles: 0,
      totalPages: 1,
    };
  }
}

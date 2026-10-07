import { NextResponse } from 'next/server';
import { getNewsCategoriesCollection, getNewsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

// GET: Danh sách chuyên mục tin tức công khai (Optimized with Aggregate pipeline)
export async function GET() {
  try {
    const categoriesColl = await getNewsCategoriesCollection();
    const newsColl = await getNewsCollection();

    const now = new Date();
    const publicFilter = {
      $or: [
        {
          status: 'published' as const,
          $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
        },
        {
          status: 'scheduled' as const,
          scheduledAt: { $lte: now },
        },
      ],
    };

    const [categories, categoryCounts] = await Promise.all([
      categoriesColl
        .find({ status: 'active' })
        .sort({ sortOrder: 1, createdAt: -1 })
        .toArray(),
      newsColl
        .aggregate<{ _id: string; count: number }>([
          { $match: publicFilter },
          { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const countMap = new Map<string, number>(
      categoryCounts.map((c) => [String(c._id), c.count])
    );

    const categoriesWithCount = categories.map((cat) => ({
      id: cat._id?.toString(),
      _id: cat._id?.toString(),
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: (cat as any).image || '',
      articlesCount: countMap.get(cat._id?.toString() || '') || 0,
    }));

    return NextResponse.json(
      {
        success: true,
        categories: categoriesWithCount,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[Public News Categories GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải danh mục tin tức.' }, { status: 500 });
  }
}

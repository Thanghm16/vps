import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getNewsCollection, getNewsCategoriesCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin();
    const newsColl = await getNewsCollection();
    const categoriesColl = await getNewsCategoriesCollection();

    const [
      total,
      draft,
      published,
      scheduled,
      archived,
      featured,
      pinned,
      categoriesCount,
      viewsAgg,
    ] = await Promise.all([
      newsColl.countDocuments(),
      newsColl.countDocuments({ status: 'draft' }),
      newsColl.countDocuments({ status: 'published' }),
      newsColl.countDocuments({ status: 'scheduled' }),
      newsColl.countDocuments({ status: 'archived' }),
      newsColl.countDocuments({ isFeatured: true }),
      newsColl.countDocuments({ isPinned: true }),
      categoriesColl.countDocuments({ status: 'active' }),
      newsColl.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]).toArray(),
    ]);

    const totalViews = viewsAgg.length > 0 ? viewsAgg[0].totalViews || 0 : 0;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        draft,
        published,
        scheduled,
        archived,
        featured,
        pinned,
        categoriesCount,
        totalViews,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Stats Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi lấy thống kê tin tức.' }, { status: 500 });
  }
}

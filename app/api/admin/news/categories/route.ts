import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCategoriesCollection, getNewsCollection } from '@/lib/db/collections';
import { slugify } from '@/lib/utils';
import { NewsCategoryDocument } from '@/types/db-news';

export const runtime = 'nodejs';

// GET: Danh sách danh mục tin tức (Admin)
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const categoriesColl = await getNewsCategoriesCollection();
    const newsColl = await getNewsCollection();

    const query: Record<string, any> = {};
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { slug: { $regex: search.trim(), $options: 'i' } },
      ];
    }
    if (status !== 'all') {
      query.status = status;
    }

    const categories = await categoriesColl
      .find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .toArray();

    // Đếm số lượng bài viết của từng danh mục
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await newsColl.countDocuments({
          $or: [
            { categoryId: cat._id },
            { categorySlug: cat.slug },
          ],
        });
        return {
          id: cat._id?.toString(),
          _id: cat._id?.toString(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          image: cat.image || '',
          status: cat.status || 'active',
          sortOrder: cat.sortOrder || 0,
          metaTitle: cat.metaTitle || '',
          metaDescription: cat.metaDescription || '',
          articlesCount: count,
          createdAt: cat.createdAt ? cat.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: cat.updatedAt ? cat.updatedAt.toISOString() : new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      categories: categoriesWithCount,
      total: categoriesWithCount.length,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Categories GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi lấy danh mục tin tức.' }, { status: 500 });
  }
}

// POST: Tạo danh mục tin tức mới (Admin)
export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = await request.json();
    const name = String(body.name || '').trim();
    let customSlug = String(body.slug || '').trim();
    const description = String(body.description || '').trim();
    const image = String(body.image || '').trim();
    const status = body.status === 'inactive' ? 'inactive' : 'active';
    const sortOrder = Number(body.sortOrder) || 0;
    const metaTitle = String(body.metaTitle || '').trim();
    const metaDescription = String(body.metaDescription || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, message: 'Tên danh mục là bắt buộc.' }, { status: 400 });
    }

    const finalSlug = slugify(customSlug || name);
    if (!finalSlug) {
      return NextResponse.json({ success: false, message: 'Slug không hợp lệ.' }, { status: 400 });
    }

    const categoriesColl = await getNewsCategoriesCollection();

    // Kiểm tra trùng slug
    const existing = await categoriesColl.findOne({ slug: finalSlug });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Slug danh mục "${finalSlug}" đã tồn tại. Vui lòng chọn slug khác.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const newDoc: NewsCategoryDocument = {
      name,
      slug: finalSlug,
      description,
      image,
      status,
      sortOrder,
      metaTitle,
      metaDescription,
      createdAt: now,
      updatedAt: now,
    };

    const result = await categoriesColl.insertOne(newDoc);

    return NextResponse.json({
      success: true,
      message: 'Tạo danh mục tin tức thành công!',
      category: {
        id: result.insertedId.toString(),
        _id: result.insertedId.toString(),
        ...newDoc,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Category Create Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi tạo danh mục tin tức.' }, { status: 500 });
  }
}

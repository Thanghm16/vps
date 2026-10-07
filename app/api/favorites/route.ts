import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth/server';
import { getFavoritesCollection, getAccountsCollection } from '@/lib/db/collections';
import { PopulatedFavoriteItem } from '@/types/db-favorite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Lấy danh sách sản phẩm yêu thích của user hiện tại (có phân trang)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100);

    const userObjectId = new ObjectId(user.id);
    const favoritesCol = await getFavoritesCollection();
    const accountsCol = await getAccountsCollection();

    const [favoriteDocs, total] = await Promise.all([
      favoritesCol
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      favoritesCol.countDocuments({ userId: userObjectId }),
    ]);

    if (favoriteDocs.length === 0) {
      return NextResponse.json({
        success: true,
        favorites: [],
        total: 0,
        page,
        totalPages: 1,
      });
    }

    // Lấy thông tin chi tiết các account trong 1 query duy nhất (tránh N+1)
    const accountIds = favoriteDocs.map((f) => f.accountId).filter(Boolean);
    const accountCodes = favoriteDocs.map((f) => f.accountCode).filter(Boolean);

    const accounts = await accountsCol
      .find({
        $or: [{ _id: { $in: accountIds } }, { code: { $in: accountCodes } }],
      })
      .toArray();

    const accountsMap = new Map<string, (typeof accounts)[0]>();
    accounts.forEach((acc) => {
      if (acc._id) accountsMap.set(acc._id.toString(), acc);
      if (acc.code) accountsMap.set(acc.code.toUpperCase(), acc);
    });

    const populatedList: PopulatedFavoriteItem[] = [];

    for (const f of favoriteDocs) {
      const acc =
        accountsMap.get(f.accountId?.toString()) ||
        accountsMap.get(f.accountCode?.toUpperCase());

      if (acc) {
        populatedList.push({
          id: acc.code,
          favoriteId: f._id?.toString() || '',
          accountId: acc._id?.toString() || '',
          code: acc.code,
          title: acc.title,
          gameSlug: acc.gameSlug,
          gameName: acc.gameName,
          price: acc.price,
          originalPrice: acc.originalPrice || acc.price,
          thumbnail: acc.thumbnail || acc.images?.[0] || '/1768727344439.jpg',
          images: acc.images || [],
          status: acc.status || 'available',
          tags: acc.tags || [],
          favoritedAt: f.createdAt ? new Date(f.createdAt).toISOString() : new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      favorites: populatedList,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để xem danh sách yêu thích.' },
        { status: 401 }
      );
    }
    console.error('[API Favorites GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải danh sách yêu thích.' },
      { status: 500 }
    );
  }
}

// POST - Thêm sản phẩm vào danh sách yêu thích
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const rawTarget =
      body?.productId || body?.accountId || body?.code || body?.accountCode;

    if (!rawTarget || typeof rawTarget !== 'string' || !rawTarget.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp mã hoặc ID sản phẩm.' },
        { status: 400 }
      );
    }

    const cleanTarget = rawTarget.trim();
    const accountsCol = await getAccountsCollection();
    const favoritesCol = await getFavoritesCollection();

    // Tìm tài khoản theo ObjectId hoặc Mã Code
    let account = null;
    if (ObjectId.isValid(cleanTarget)) {
      account = await accountsCol.findOne({ _id: new ObjectId(cleanTarget) });
    }
    if (!account) {
      account = await accountsCol.findOne({
        code: { $regex: `^${cleanTarget}$`, $options: 'i' },
      });
    }

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy tài khoản game.' },
        { status: 404 }
      );
    }

    if (account.status === 'hidden') {
      return NextResponse.json(
        { success: false, message: 'Tài khoản này hiện không khả dụng.' },
        { status: 400 }
      );
    }

    const userObjectId = new ObjectId(user.id);
    const now = new Date();

    // Sử dụng upsert an toàn chống duplicate
    await favoritesCol.updateOne(
      {
        userId: userObjectId,
        accountId: account._id,
      },
      {
        $setOnInsert: {
          userId: userObjectId,
          accountId: account._id,
          accountCode: account.code,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      isFavorite: true,
      code: account.code,
      accountId: account._id.toString(),
      message: `Đã thêm nick ${account.code} vào danh sách yêu thích!`,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.' },
        { status: 401 }
      );
    }
    console.error('[API Favorites POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi thêm vào danh sách yêu thích.' },
      { status: 500 }
    );
  }
}

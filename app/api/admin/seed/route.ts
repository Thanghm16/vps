import { NextResponse } from 'next/server';
import { getGamesCollection, getAccountsCollection } from '@/lib/db/collections';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { GameCategoryDocument } from '@/types/db-account';

export const runtime = 'nodejs';

const INITIAL_GAMES: GameCategoryDocument[] = [
  { name: 'Liên Quân Mobile', slug: 'lien-quan-mobile', accountsCount: 0 },
  { name: 'Valorant', slug: 'valorant', accountsCount: 0 },
  { name: 'Free Fire', slug: 'free-fire', accountsCount: 0 },
  { name: 'FC Online', slug: 'fc-online', accountsCount: 0 },
  { name: 'Liên Minh Huyền Thoại', slug: 'lien-minh-huyen-thoai', accountsCount: 0 },
  { name: 'Genshin Impact', slug: 'genshin-impact', accountsCount: 0 },
  { name: 'Roblox', slug: 'roblox', accountsCount: 0 },
  { name: 'PUBG Mobile', slug: 'pubg-mobile', accountsCount: 0 },
  { name: 'Tốc Chiến', slug: 'toc-chien', accountsCount: 0 },
  { name: 'Honkai: Star Rail', slug: 'honkai-star-rail', accountsCount: 0 },
];

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra CSRF Origin
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Yêu cầu không hợp lệ (CSRF check failed).' }, { status: 403 });
    }

    // 2. Yêu cầu quyền Administrator BẮT BUỘC (Không cho phép unauthenticated request kể cả khi DB rỗng)
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Truy cập bị từ chối. Chỉ Administrator mới có quyền thực hiện thao tác này.' },
        { status: 403 }
      );
    }

    const gamesCollection = await getGamesCollection();
    const accountsCollection = await getAccountsCollection();

    // 3. Gieo danh mục game
    for (const g of INITIAL_GAMES) {
      await gamesCollection.updateOne(
        { slug: g.slug },
        {
          $setOnInsert: {
            name: g.name,
            slug: g.slug,
            accountsCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // 3. Cập nhật lại accountsCount cho từng danh mục
    for (const g of INITIAL_GAMES) {
      const count = await accountsCollection.countDocuments({
        gameSlug: g.slug,
        status: 'available',
      });
      await gamesCollection.updateOne(
        { slug: g.slug },
        { $set: { accountsCount: count } }
      );
    }

    const totalAccounts = await accountsCollection.countDocuments();

    return NextResponse.json({
      success: true,
      message: `Đồng bộ dữ liệu thành công: ${INITIAL_GAMES.length} danh mục game và ${totalAccounts} tài khoản trong hệ thống!`,
    });
  } catch (error) {
    console.error('[Seed Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi gieo dữ liệu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

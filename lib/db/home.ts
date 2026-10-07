import { getAccountsCollection, getBannersCollection } from './collections';
import { getGamesWithCounts } from './games';
import { getTopDepositorsFromDb } from './top-deposits';
import { getWebsiteSettingsFromDb } from './settings';
import { serializePublicAccount, GameAccountDocument } from '@/types/db-account';
import { GameAccount, TopDepositor } from '@/types/account';
import { BannerClientData } from '@/types/db-banner';
import { FullSystemSettingsDocument } from '@/types/settings';

export interface HomeInitialData {
  categories: { id: string; name: string }[];
  featuredAccounts: GameAccount[];
  initialAccounts: GameAccount[];
  totalAccounts: number;
  totalPages: number;
  customBanners: BannerClientData[];
  topDepositors: TopDepositor[];
  settings: FullSystemSettingsDocument;
}

/**
 * Lấy toàn bộ dữ liệu ban đầu cho Trang Chủ trực tiếp từ MongoDB trên Server
 * Triệt tiêu hoàn toàn 5 request HTTP waterfall từ browser.
 */
export async function getHomeInitialData(): Promise<HomeInitialData> {
  try {
    const [gamesWithCount, accountsCol, bannersCol, topDepositors, settings] =
      await Promise.all([
        getGamesWithCounts().catch(() => []),
        getAccountsCollection(),
        getBannersCollection(),
        getTopDepositorsFromDb('month', 5).catch(() => []),
        getWebsiteSettingsFromDb(),
      ]);

    // Categories formatted
    const categories = [
      { id: 'all', name: 'Tất cả' },
      ...gamesWithCount.map((g) => ({ id: g.slug, name: g.name })),
    ];

    const now = new Date();

    // Parallel queries trên accounts & banners
    const [featuredDocs, initialDocs, totalCount, rawBanners] = await Promise.all([
      // Featured accounts (Hero banner)
      accountsCol
        .find(
          {
            status: 'available',
            $or: [{ isFeatured: true }, { isHot: true }],
          },
          { projection: { credentials: 0 } }
        )
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray(),

      // Initial page 1 accounts (Grid)
      accountsCol
        .find(
          { status: 'available' },
          { projection: { credentials: 0 } }
        )
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),

      // Total available count
      accountsCol.countDocuments({ status: 'available' }),

      // Active Banners
      bannersCol
        .find({
          isActive: true,
          $and: [
            { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
            { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
          ],
        })
        .sort({ sortOrder: 1, createdAt: -1 })
        .project({
          title: 1,
          subtitle: 1,
          desktopImage: 1,
          mobileImage: 1,
          buttonText: 1,
          link: 1,
          openInNewTab: 1,
          sortOrder: 1,
        })
        .toArray(),
    ]);

    const featuredAccounts = featuredDocs.map((d) =>
      serializePublicAccount(d as GameAccountDocument) as unknown as GameAccount
    );

    const initialAccounts = initialDocs.map((d) =>
      serializePublicAccount(d as GameAccountDocument) as unknown as GameAccount
    );

    const customBanners: BannerClientData[] = rawBanners.map((b) => ({
      id: b._id?.toString() || '',
      _id: b._id?.toString() || '',
      title: b.title,
      subtitle: b.subtitle || '',
      desktopImage: b.desktopImage?.url ? { url: b.desktopImage.url } : { url: '' },
      mobileImage: b.mobileImage?.url ? { url: b.mobileImage.url } : undefined,
      imageUrl: b.desktopImage?.url || '',
      buttonText: b.buttonText || 'Xem Ngay',
      ctaText: b.buttonText || 'Xem Ngay',
      link: b.link || '',
      openInNewTab: Boolean(b.openInNewTab),
      sortOrder: b.sortOrder || 1,
      isActive: true,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
    }));

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      categories,
      featuredAccounts,
      initialAccounts,
      totalAccounts: totalCount,
      totalPages,
      customBanners,
      topDepositors,
      settings,
    };
  } catch (err) {
    console.warn('[HomeInitialData] Could not fetch live data from DB, using fallback defaults:', err);
    const settings = await getWebsiteSettingsFromDb();
    return {
      categories: [{ id: 'all', name: 'Tất cả' }],
      featuredAccounts: [],
      initialAccounts: [],
      totalAccounts: 0,
      totalPages: 1,
      customBanners: [],
      topDepositors: [],
      settings,
    };
  }
}

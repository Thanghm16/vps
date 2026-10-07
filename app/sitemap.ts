import { MetadataRoute } from 'next';
import { getNewsCollection, getGamesCollection, getAccountsCollection } from '@/lib/db/collections';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';

export const runtime = 'nodejs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getWebsiteSettingsFromDb();
  const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');

  const routes: MetadataRoute.Sitemap = [
    // 1. Homepage
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // 2. News Listing
    {
      url: `${siteUrl}/tin-tuc`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  try {
    // 3. Danh mục & Landing Pages Game (Ví dụ: /game/lien-quan, /game/valorant...)
    const gamesColl = await getGamesCollection();
    const games = await gamesColl.find({}).toArray();
    for (const game of games) {
      if (game.slug) {
        routes.push({
          url: `${siteUrl}/game/${encodeURIComponent(game.slug)}`,
          lastModified: game.updatedAt || new Date(),
          changeFrequency: 'daily',
          priority: 0.9,
        });
      }
    }

    // 4. Toàn bộ bài viết Tin Tức & Cẩm Nang đã xuất bản
    const newsColl = await getNewsCollection();
    const now = new Date();
    const publishedNews = await newsColl
      .find(
        {
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
        },
        {
          projection: { slug: 1, updatedAt: 1, publishedAt: 1 },
        }
      )
      .toArray();

    for (const article of publishedNews) {
      if (article.slug) {
        routes.push({
          url: `${siteUrl}/tin-tuc/${encodeURIComponent(article.slug)}`,
          lastModified: article.updatedAt || article.publishedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }

    // 5. Toàn bộ Sản Phẩm / Nick Game đang mở bán (Available)
    const accountsColl = await getAccountsCollection();
    const availableAccounts = await accountsColl
      .find(
        { status: 'available' },
        {
          projection: { code: 1, updatedAt: 1, createdAt: 1 },
        }
      )
      .limit(5000)
      .toArray();

    for (const acc of availableAccounts) {
      if (acc.code) {
        const cleanCode = acc.code.replace(/^#/, '');
        routes.push({
          url: `${siteUrl}/account/${encodeURIComponent(cleanCode)}`,
          lastModified: acc.updatedAt || acc.createdAt || new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.warn('[Sitemap Generator Error]:', error);
  }

  return routes;
}

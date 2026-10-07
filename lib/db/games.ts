import { getGamesCollection, getAccountsCollection } from './collections';

export interface GameWithCount {
  id: string;
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  accountsCount: number;
}

/**
 * Lấy danh sách danh mục game kèm số lượng tài khoản 'available' bằng MongoDB Aggregation tối ưu
 * Triệt tiêu hoàn toàn N+1 query.
 */
export async function getGamesWithCounts(): Promise<GameWithCount[]> {
  const gamesCollection = await getGamesCollection();
  const accountsCollection = await getAccountsCollection();

  const [games, accountCounts] = await Promise.all([
    gamesCollection.find({}).project({ name: 1, slug: 1, icon: 1 }).toArray(),
    accountsCollection
      .aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: '$gameSlug', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countMap = new Map<string, number>(
    accountCounts.map((item) => [String(item._id), item.count as number])
  );

  return games.map((game) => ({
    id: game.slug,
    _id: game._id?.toString() || game.slug,
    name: game.name,
    slug: game.slug,
    icon: (game as { icon?: string }).icon,
    accountsCount: countMap.get(game.slug) || 0,
  }));
}

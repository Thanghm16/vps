import { NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { getAccountsCollection } from '@/lib/db/collections';
import { serializePublicAccount, GameAccountDocument } from '@/types/db-account';
import { AccountStatus } from '@/types/account';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || 'all';
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'available';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const featured = searchParams.get('featured') === 'true' || searchParams.get('isFeatured') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 50);

    const query: Filter<GameAccountDocument> = {};

    const minPriceRaw = searchParams.get('minPrice');
    const maxPriceRaw = searchParams.get('maxPrice');
    const rank = searchParams.get('rank');
    const tag = searchParams.get('tag');

    // 1. Lọc theo trạng thái (mặc định chỉ hiển thị 'available' cho khách)
    if (status !== 'all') {
      query.status = status as AccountStatus;
    } else {
      query.status = { $ne: 'hidden' as AccountStatus };
    }

    // 2. Lọc theo game
    if (game && game !== 'all') {
      query.gameSlug = game;
    }

    // 3. Lọc theo khoảng giá
    if (minPriceRaw || maxPriceRaw) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (minPriceRaw && !isNaN(Number(minPriceRaw)) && Number(minPriceRaw) > 0) {
        priceFilter.$gte = Number(minPriceRaw);
      }
      if (maxPriceRaw && !isNaN(Number(maxPriceRaw)) && Number(maxPriceRaw) > 0) {
        priceFilter.$lte = Number(maxPriceRaw);
      }
      if (Object.keys(priceFilter).length > 0) {
        query.price = priceFilter;
      }
    }

    // 4. Lọc theo Tag
    if (tag && tag.trim()) {
      query.tags = { $in: [new RegExp(tag.trim(), 'i')] };
    }

    // 5. Lọc theo Rank
    if (rank && rank !== 'all' && rank.trim()) {
      const rankRegex = { $regex: rank.trim(), $options: 'i' };
      query['details.Rank'] = rankRegex;
    }

    // 6. Lọc theo Featured nếu được yêu cầu (dành cho Hero Banner)
    if (featured) {
      (query as Record<string, unknown>).$or = [{ isFeatured: true }, { isHot: true }];
    }

    // 7. Tìm kiếm theo từ khóa
    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      (query as Record<string, unknown>).$or = [
        { code: regex },
        { title: regex },
        { gameName: regex },
        { tags: regex },
        { highlights: regex },
        { 'details.Rank': regex },
        { 'details.rank': regex },
      ];
    }

    // 8. Sắp xếp
    const sort: Record<string, 1 | -1> = {};
    if (sortBy === 'price-low' || sortBy === 'price_asc') {
      sort.price = 1;
    } else if (sortBy === 'price-high' || sortBy === 'price_desc') {
      sort.price = -1;
    } else if (sortBy === 'views') {
      sort.views = -1;
    } else if (sortBy === 'discount') {
      sort.discountPercent = -1;
    } else {
      sort.createdAt = -1;
    }

    const accountsCollection = await getAccountsCollection();
    const total = await accountsCollection.countDocuments(query);
    const skip = (page - 1) * limit;

    // Tối ưu: Loại bỏ trường credentials ngay tại tầng MongoDB query để tiết kiệm bộ nhớ
    const rawAccounts = await accountsCollection
      .find(query, { projection: { credentials: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    // 5. Làm sạch dữ liệu: Tuyệt đối không gửi credentials ra ngoài
    const safeAccounts = rawAccounts.map(serializePublicAccount);

    return NextResponse.json({
      success: true,
      accounts: safeAccounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[API GET Accounts Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tải danh sách tài khoản.' },
      { status: 500 }
    );
  }
}

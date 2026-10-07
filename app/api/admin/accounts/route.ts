import { NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { getAccountsCollection, getGamesCollection } from '@/lib/db/collections';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { encryptCredentials, decryptCredentials } from '@/lib/crypto/encryption';
import { GameAccountDocument } from '@/types/db-account';
import { AccountStatus } from '@/types/account';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '15', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 15 : rawLimit), 100);

    const query: Filter<GameAccountDocument> = {};
    if (game !== 'all') query.gameSlug = game;
    if (status !== 'all') query.status = status as AccountStatus;
    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      (query as Record<string, unknown>).$or = [
        { code: regex },
        { title: regex },
        { 'details.rank': regex },
      ];
    }

    const accounts = await getAccountsCollection();
    const total = await accounts.countDocuments(query);
    const skip = (page - 1) * limit;

    const list = await accounts
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      accounts: list.map((acc) => ({
        ...acc,
        credentials: decryptCredentials(acc.credentials),
        id: acc._id?.toString() || acc.code,
        _id: acc._id?.toString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = await request.json();
    const {
      code,
      gameSlug,
      gameName,
      title,
      price,
      originalPrice,
      thumbnail,
      images,
      tags,
      highlights,
      description,
      status,
      isVerified,
      isFeatured,
      isHot,
      details,
      credentials,
    } = body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ success: false, message: 'Mã nick không được để trống.' }, { status: 400 });
    }

    if (!gameSlug || typeof gameSlug !== 'string') {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn danh mục game.' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, message: 'Tiêu đề không được để trống.' }, { status: 400 });
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ success: false, message: 'Giá bán không hợp lệ.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const accounts = await getAccountsCollection();

    // Kiểm tra trùng lặp mã code
    const existing = await accounts.findOne({ code: cleanCode });
    if (existing) {
      return NextResponse.json({ success: false, message: `Mã nick ${cleanCode} đã tồn tại!` }, { status: 409 });
    }

    const newDoc: GameAccountDocument = {
      code: cleanCode,
      gameSlug: gameSlug.trim().toLowerCase(),
      gameName: gameName || 'Game Online',
      title: title.trim(),
      slug: `${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
      images: Array.isArray(images) && images.length > 0 ? images : [thumbnail],
      price,
      originalPrice: originalPrice || price,
      discountPercent: originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0,
      tags: Array.isArray(tags) ? tags : [],
      highlights: Array.isArray(highlights) ? highlights : [],
      description: description || '',
      status: status || 'available',
      isVerified: !!isVerified,
      isFeatured: !!isFeatured,
      isHot: !!isHot,
      views: 0,
      rating: 5.0,
      reviewCount: 0,
      warrantyPolicy: 'Bảo hành đổi trả 100% trong 24h nếu sai thông tin.',
      details: typeof details === 'object' && details !== null ? details : {},
      credentials: credentials ? encryptCredentials({
        loginUsername: credentials.loginUsername || '',
        loginPassword: credentials.loginPassword || '',
        twoFactorCode: credentials.twoFactorCode || '',
        emailBound: credentials.emailBound || 'Trắng thông tin',
        phoneBound: credentials.phoneBound || 'Trắng thông tin',
        note: credentials.note || '',
      }) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await accounts.insertOne(newDoc);

    // Cập nhật số lượng nick trong danh mục game
    try {
      const games = await getGamesCollection();
      await games.updateOne(
        { slug: newDoc.gameSlug },
        { $inc: { accountsCount: 1 } }
      );
    } catch (e) {
      console.warn('Game count increment failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Thêm nick mới vào kho thành công!',
      account: { ...newDoc, id: insertResult.insertedId.toString(), _id: insertResult.insertedId.toString() },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[API Create Account Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi tạo nick mới.' }, { status: 500 });
  }
}

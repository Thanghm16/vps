import { NextResponse } from 'next/server';
import { getGamesCollection } from '@/lib/db/collections';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    await requireAdmin();
    const games = await getGamesCollection();
    const list = await games.find({}).toArray();

    return NextResponse.json({
      success: true,
      games: list.map((g) => ({
        id: g._id?.toString() || g.slug,
        _id: g._id?.toString(),
        name: g.name,
        slug: g.slug,
        accountsCount: g.accountsCount || 0,
      })),
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
    const { name, slug } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Tên game không được để trống.' }, { status: 400 });
    }

    // Tự động tạo slug chuẩn SEO trên server từ tên game (hoặc slug tùy biến nếu có)
    const rawSlug = slug && typeof slug === 'string' && slug.trim()
      ? slugify(slug)
      : slugify(name);

    if (!rawSlug) {
      return NextResponse.json({ success: false, message: 'Không thể tạo slug từ tên game.' }, { status: 400 });
    }

    const games = await getGamesCollection();

    // Tự động kiểm tra và xử lý trùng lặp slug trên server
    let cleanSlug = rawSlug;
    let counter = 2;
    while (await games.findOne({ slug: cleanSlug })) {
      cleanSlug = `${rawSlug}-${counter}`;
      counter++;
    }

    const newGame = {
      name: name.trim(),
      slug: cleanSlug,
      accountsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await games.insertOne(newGame);

    return NextResponse.json({
      success: true,
      message: `Thêm danh mục "${newGame.name}" thành công với slug /${newGame.slug}!`,
      game: { ...newGame, id: result.insertedId.toString(), _id: result.insertedId.toString() },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi tạo game.' }, { status: 500 });
  }
}

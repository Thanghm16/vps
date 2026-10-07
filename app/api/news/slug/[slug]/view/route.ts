import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getNewsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

// POST: Tăng lượt xem bài viết có cơ chế chống spam bằng cookie
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Slug không hợp lệ.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieName = `v_n_${slug.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32)}`;
    const hasViewed = cookieStore.get(cookieName);

    const newsColl = await getNewsCollection();

    // Nếu đã xem trong vòng 15 phút thì không tăng view
    if (hasViewed) {
      const current = await newsColl.findOne({ slug }, { projection: { views: 1 } });
      return NextResponse.json({
        success: true,
        incremented: false,
        views: current?.views || 0,
      });
    }

    // Tăng 1 lượt xem trong MongoDB
    const result = await newsColl.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { returnDocument: 'after', projection: { views: 1 } }
    );

    const response = NextResponse.json({
      success: true,
      incremented: true,
      views: result?.views || 1,
    });

    // Thiết lập cookie chống spam trong 15 phút (900s)
    response.cookies.set(cookieName, '1', {
      maxAge: 15 * 60,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('[Public News View Counter Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi cập nhật lượt xem.' }, { status: 500 });
  }
}

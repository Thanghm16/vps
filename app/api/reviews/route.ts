import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import { getReviewsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Lấy danh sách đánh giá website (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const col = await getReviewsCollection();
    const [reviews, total, avgStats] = await Promise.all([
      col.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments({}),
      col.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ]).toArray(),
    ]);

    const avgRating =
      avgStats.length > 0 && typeof avgStats[0].avgRating === 'number'
        ? Number(avgStats[0].avgRating.toFixed(1))
        : 5.0;

    const formatted = reviews.map((r) => ({
      id: r._id?.toString(),
      username: r.username,
      userAvatar: r.userAvatar || null,
      rating: r.rating || 5,
      accountBought: r.accountBought || 'Nick Game',
      comment: r.comment,
      isVerified: r.isVerified ?? true,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      displayDate: r.createdAt
        ? new Date(r.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'Vừa xong',
    }));

    return NextResponse.json(
      {
        success: true,
        reviews: formatted,
        total,
        avgRating,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[Reviews GET Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải đánh giá.' }, { status: 500 });
  }
}

// POST - Gửi đánh giá website (phải đăng nhập)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để gửi đánh giá.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, comment, accountBought } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn số sao (1-5).' }, { status: 400 });
    }
    if (!comment || comment.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: 'Nội dung đánh giá phải có ít nhất 10 ký tự.' },
        { status: 400 }
      );
    }

    const col = await getReviewsCollection();
    const userObjectId = new ObjectId(user.id);

    // Kiểm tra đã đánh giá chưa (mỗi user chỉ được 1 đánh giá)
    const existing = await col.findOne({ userId: userObjectId });
    if (existing) {
      // Cập nhật đánh giá cũ
      await col.updateOne(
        { userId: userObjectId },
        {
          $set: {
            rating: Number(rating),
            comment: comment.trim(),
            accountBought: accountBought?.trim() || existing.accountBought,
            updatedAt: new Date(),
          },
        }
      );
      return NextResponse.json({ success: true, message: 'Đã cập nhật đánh giá của bạn.' });
    }

    // Tạo đánh giá mới
    await col.insertOne({
      userId: userObjectId,
      username: user.username,
      userAvatar: user.avatar || undefined,
      rating: Number(rating),
      accountBought: accountBought?.trim() || 'Nick Game',
      comment: comment.trim(),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (error) {
    console.error('[Reviews POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi gửi đánh giá: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import { getFavoritesCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Kiểm tra trạng thái yêu thích của 1 sản phẩm
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: true, isFavorite: false });
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: true, isFavorite: false });
    }

    const cleanId = id.trim();
    const favoritesCol = await getFavoritesCollection();

    const orConditions: any[] = [
      { accountCode: { $regex: `^${cleanId}$`, $options: 'i' } },
    ];

    if (ObjectId.isValid(cleanId)) {
      orConditions.push({ accountId: new ObjectId(cleanId) });
    }

    const existing = await favoritesCol.findOne({
      userId: new ObjectId(user.id),
      $or: orConditions,
    });

    return NextResponse.json({
      success: true,
      isFavorite: Boolean(existing),
    });
  } catch (error) {
    console.error('[API Favorites Check Error]:', error);
    return NextResponse.json({ success: true, isFavorite: false });
  }
}

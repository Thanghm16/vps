import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import { getFavoritesCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Lấy toàn bộ danh sách mã/ID sản phẩm đã yêu thích của user (Batch query chống N+1)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        ids: [],
        codes: [],
      });
    }

    const favoritesCol = await getFavoritesCollection();
    const docs = await favoritesCol
      .find({ userId: new ObjectId(user.id) })
      .project({ accountId: 1, accountCode: 1 })
      .toArray();

    const ids = docs.map((d) => d.accountId?.toString()).filter(Boolean);
    const codes = docs.map((d) => d.accountCode?.toUpperCase()).filter(Boolean);

    return NextResponse.json({
      success: true,
      ids,
      codes,
      count: codes.length,
    });
  } catch (error) {
    console.error('[API Favorites IDs Error]:', error);
    return NextResponse.json({
      success: true,
      ids: [],
      codes: [],
      count: 0,
    });
  }
}

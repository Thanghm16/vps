import { NextResponse } from 'next/server';
import { getGamesWithCounts } from '@/lib/db/games';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const games = await getGamesWithCounts();

    return NextResponse.json(
      {
        success: true,
        games,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[API GET Games Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tải danh mục game.' },
      { status: 500 }
    );
  }
}

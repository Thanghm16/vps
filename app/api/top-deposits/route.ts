import { NextRequest, NextResponse } from 'next/server';
import { getTopDepositorsFromDb } from '@/lib/db/top-deposits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || '5', 10)));

    const depositors = await getTopDepositorsFromDb(period, limit);

    return NextResponse.json(
      {
        success: true,
        depositors,
        period,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[Top Deposits API Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải danh sách top nạp.' },
      { status: 500 }
    );
  }
}

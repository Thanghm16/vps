import { NextResponse } from 'next/server';
import { getLuckyWheelsCollection } from '@/lib/db/collections';
import { sanitizeWheelForClient } from '@/lib/lucky-wheel/wheel-db';

export const runtime = 'nodejs';

/**
 * GET /api/lucky-wheel
 * Lấy danh sách tất cả các vòng quay đang active/enabled (Sanitized)
 */
export async function GET() {
  try {
    const wheelsCol = await getLuckyWheelsCollection();
    const wheels = await wheelsCol
      .find({ status: 'active', enabled: true })
      .sort({ createdAt: -1 })
      .toArray();

    const data = wheels.map((w) => sanitizeWheelForClient(w));

    return NextResponse.json({
      success: true,
      wheels: data,
    });
  } catch (error) {
    console.error('[API /api/lucky-wheel GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi nạp danh sách vòng quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getBannersCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Tăng số lượt click vào banner (Tracking)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID banner không hợp lệ.' },
        { status: 400 }
      );
    }

    const bannersCol = await getBannersCollection();
    await bannersCol.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { clickCount: 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Banner Click Tracking Error]:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

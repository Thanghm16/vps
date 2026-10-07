import { NextResponse } from 'next/server';
import { Filter } from 'mongodb';
import { getBannersCollection } from '@/lib/db/collections';
import { BannerDocument } from '@/types/db-banner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Lấy danh sách banner trang chủ đang hoạt động và trong thời gian hiệu lực
export async function GET() {
  try {
    const now = new Date();
    const query: Filter<BannerDocument> = {
      isActive: true,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    };

    const bannersCol = await getBannersCollection();
    const list = await bannersCol
      .find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .project({
        title: 1,
        subtitle: 1,
        desktopImage: 1,
        mobileImage: 1,
        buttonText: 1,
        link: 1,
        openInNewTab: 1,
        sortOrder: 1,
        startAt: 1,
        endAt: 1,
      })
      .toArray();

    const formatted = list.map((b) => ({
      id: b._id?.toString(),
      _id: b._id?.toString(),
      title: b.title,
      subtitle: b.subtitle || '',
      desktopImage: b.desktopImage?.url ? { url: b.desktopImage.url } : { url: '' },
      mobileImage: b.mobileImage?.url ? { url: b.mobileImage.url } : undefined,
      imageUrl: b.desktopImage?.url || '',
      buttonText: b.buttonText || 'Xem Ngay',
      ctaText: b.buttonText || 'Xem Ngay',
      link: b.link || '',
      openInNewTab: Boolean(b.openInNewTab),
      sortOrder: b.sortOrder || 1,
    }));

    return NextResponse.json(
      {
        success: true,
        banners: formatted,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[API Public Banners GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải banner trang chủ.', banners: [] },
      { status: 500 }
    );
  }
}

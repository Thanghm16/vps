import React from 'react';
import { Metadata } from 'next';
import { getActiveWheel, sanitizeWheelForClient, getRecentWinners } from '@/lib/lucky-wheel/wheel-db';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import LuckyWheelClientView from '@/components/lucky-wheel/LuckyWheelClientView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [settings, wheel] = await Promise.all([
      getWebsiteSettingsFromDb(),
      getActiveWheel(),
    ]);

    const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
    const brandName = settings.brandName || settings.siteName || 'GameStore';

    const title = wheel?.seoTitle || `Vòng Quay May Mắn - Trúng Nick Game VIP, Thẻ Cào & Voucher | ${brandName}`;
    const description =
      wheel?.seoDescription ||
      `Tham gia Vòng Quay May Mắn tại ${brandName} để có cơ hội trúng nick Liên Quân, Free Fire, Valorant, thẻ cào và hàng ngàn voucher giảm giá cực khủng hoàn toàn miễn phí.`;
    const canonicalUrl = `${siteUrl}/vong-quay-may-man`;
    const ogImageUrl = wheel?.thumbnail || settings.seo?.ogImage?.url;

    return {
      title,
      description,
      keywords: [
        'vong quay may man',
        'vong quay lien quan',
        'vong quay free fire',
        'vong quay trung nick',
        'quay thuong nhan nick',
        'shop acc game',
        'mini game trung thuong',
      ],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: brandName,
        type: 'website',
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImageUrl ? [ogImageUrl] : undefined,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    return {
      title: 'Vòng Quay May Mắn - Nhận Quà Khủng',
      description: 'Tham gia vòng quay may mắn để nhận nick game vip và nhiều phần quà hấp dẫn.',
    };
  }
}

export default async function LuckyWheelPage() {
  const [wheelDoc, recentWinners] = await Promise.all([
    getActiveWheel(),
    getRecentWinners(undefined, 20),
  ]);

  const initialWheel = wheelDoc ? sanitizeWheelForClient(wheelDoc) : null;

  return (
    <LuckyWheelClientView
      initialWheel={initialWheel}
      initialWinners={recentWinners}
    />
  );
}

import React from 'react';
import { Metadata } from 'next';
import { getNewsInitialData } from '@/lib/db/news-page';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import NewsClientView from '@/components/news/NewsClientView';

export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getWebsiteSettingsFromDb();
    const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
    const brandName = settings.brandName || settings.siteName || 'GameStore';

    const title = `Tin Tức & Cẩm Nang Game VIP, Hướng Dẫn Mua Bán Nick | ${brandName}`;
    const description = `Tổng hợp tin tức game mới nhất, cẩm nang leo rank, mẹo build đồ, phân tích meta tướng và hướng dẫn giao dịch tài khoản game tự động an toàn 100% tại ${brandName}.`;
    const canonicalUrl = `${siteUrl}/tin-tuc`;
    const ogImageUrl = settings.seo?.ogImage?.url;

    return {
      title,
      description,
      keywords: [
        'tin tuc game',
        'cam nang game',
        'huong dan mua nick',
        'meo leo rank',
        'build do lien quan',
        'meta valorant',
        'shop acc uy tin',
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
        locale: 'vi_VN',
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
    };
  } catch {
    return {
      title: 'Tin Tức & Cẩm Nang Game | GameStore',
      description: 'Tin tức, hướng dẫn leo rank và mua bán tài khoản game uy tín.',
    };
  }
}

export default async function PublicNewsPage() {
  const initialData = await getNewsInitialData();

  return <NewsClientView initialData={initialData} />;
}

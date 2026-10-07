import { MetadataRoute } from 'next';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';

export const runtime = 'nodejs';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getWebsiteSettingsFromDb();
  const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/game/',
          '/account/',
          '/nick/',
          '/tin-tuc/',
          '/_next/static/',
          '/favicon.ico',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/profile',
          '/profile/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/search',
          '/deposit',
          '/nap-tien',
          '/checkout',
          '/cart',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/'],
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AntdConfigProvider from '@/components/common/AntdConfigProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/components/cart/CartProvider';
import { FavoritesProvider } from '@/components/favorites/FavoritesProvider';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import JsonLd from '@/components/seo/JsonLd';
import { getWebsiteSettingsFromDb, extractPublicSettings } from '@/lib/db/settings';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const fullSettings = await getWebsiteSettingsFromDb();
    const seo = fullSettings.seo;
    const title = seo.title || fullSettings.siteName || 'GameStore - Mua Bán Nick Game Uy Tín';
    const description =
      seo.description ||
      fullSettings.siteDescription ||
      'Sàn giao dịch tài khoản, nick game Liên Quân Mobile, Free Fire, Valorant, PUBG Mobile, FC Online uy tín, giá rẻ, giao dịch tự động 24/7.';
    const faviconUrl = fullSettings.favicon?.url || '/favicon.ico';
    const ogImageUrl = seo.ogImage?.url;
    const siteUrl = (fullSettings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');

    let metadataBase: URL | undefined = undefined;
    try {
      metadataBase = new URL(siteUrl);
    } catch {
      metadataBase = undefined;
    }

    return {
      title: {
        default: title,
        template: `%s | ${fullSettings.brandName || fullSettings.siteName || 'GameStore'}`,
      },
      description,
      keywords: seo.keywords && seo.keywords.length > 0
        ? seo.keywords
        : ['mua nick game', 'shop nick game', 'nick lien quan', 'acc valorant', 'nick free fire', 'shop acc uy tin'],
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
      alternates: {
        canonical: seo.canonicalUrl || siteUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: fullSettings.brandName || fullSettings.siteName || 'GameStore',
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] : [],
        type: 'website',
        locale: 'vi_VN',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
      verification: {
        google: (seo as any)?.googleVerification || process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
      },
      metadataBase,
    };
  } catch (error) {
    return {
      title: 'GameStore - Marketplace Mua Bán Tài Khoản & Nick Game Uy Tín',
      description:
        'Sàn giao dịch tài khoản, nick game Liên Quân Mobile, Free Fire, Valorant, PUBG Mobile, FC Online, Tốc Chiến uy tín, giao dịch tự động 24/7.',
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialSettings;
  let fullSettings;
  try {
    fullSettings = await getWebsiteSettingsFromDb();
    initialSettings = extractPublicSettings(fullSettings);
  } catch (e) {
    // fallback to client-side fetching
  }

  const siteUrl = (fullSettings?.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
  const brandName = fullSettings?.brandName || fullSettings?.siteName || 'GameStore';
  const logoUrl = fullSettings?.logo?.url || `${siteUrl}/logo.png`;

  // Root WebSite & Organization Structured Data Schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brandName,
    url: siteUrl,
    description: fullSettings?.seo?.description || fullSettings?.siteDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brandName,
    url: siteUrl,
    logo: logoUrl,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: fullSettings?.contact?.phone || '+84999999999',
      contactType: 'customer service',
      areaServed: 'VN',
      availableLanguage: 'Vietnamese',
    },
    sameAs: [
      fullSettings?.social?.facebook,
      fullSettings?.social?.youtube,
      fullSettings?.social?.tiktok,
      fullSettings?.social?.telegram,
    ].filter(Boolean),
  };

  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <JsonLd data={[websiteSchema, organizationSchema]} />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-rose-600 selection:text-white">
        <AntdConfigProvider>
          <AuthProvider>
            <SettingsProvider initialSettings={initialSettings}>
              <CartProvider>
                <FavoritesProvider>
                  <AnnouncementBar />
                  {children}
                </FavoritesProvider>
              </CartProvider>
            </SettingsProvider>
          </AuthProvider>
        </AntdConfigProvider>
      </body>
    </html>
  );
}



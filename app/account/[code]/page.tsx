import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { getAccountsCollection } from '@/lib/db/collections';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import { serializePublicAccount, GameAccountDocument } from '@/types/db-account';
import { GameAccount } from '@/types/account';
import AccountDetailView from '@/components/account/AccountDetailView';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import JsonLd from '@/components/seo/JsonLd';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ code: string }>;
}

// 1. READ-ONLY QUERY FOR METADATA (Memoized per request, không làm tăng view counter ảo)
const getAccountForMetadata = cache(async (rawCode: string): Promise<GameAccount | null> => {
  const cleanCode = decodeURIComponent(rawCode).replace('#', '').toUpperCase();
  const searchCodes = [cleanCode, `#${cleanCode}`];

  try {
    const accountsCollection = await getAccountsCollection();
    const doc = await accountsCollection.findOne(
      { code: { $in: searchCodes } },
      { projection: { credentials: 0 } }
    );

    if (!doc) return null;
    return serializePublicAccount(doc as GameAccountDocument) as unknown as GameAccount;
  } catch {
    return null;
  }
});

// 2. FULL QUERY & VIEW INCREMENT CHO PAGE RENDER
async function getAccountByCode(rawCode: string): Promise<{ account: GameAccount | null; related: GameAccount[] }> {
  const cleanCode = decodeURIComponent(rawCode).replace('#', '').toUpperCase();
  const searchCodes = [cleanCode, `#${cleanCode}`];

  try {
    const accountsCollection = await getAccountsCollection();
    const doc = await accountsCollection.findOneAndUpdate(
      { code: { $in: searchCodes } },
      { $inc: { views: 1 } },
      { returnDocument: 'after', projection: { credentials: 0 } }
    );

    if (!doc) {
      return { account: null, related: [] };
    }

    const publicAccount = serializePublicAccount(doc as GameAccountDocument) as unknown as GameAccount;

    // Lấy các tài khoản tương tự cùng game (lên đến 8 nick)
    const relatedDocs = await accountsCollection
      .find(
        {
          gameSlug: doc.gameSlug,
          code: { $ne: doc.code },
          status: 'available',
        },
        { projection: { credentials: 0 } }
      )
      .limit(8)
      .toArray();

    let related = relatedDocs.map(
      (d) => serializePublicAccount(d as GameAccountDocument) as unknown as GameAccount
    );

    // Nếu ít hơn 4 nick cùng game, bổ sung thêm các nick hot khác trong kho
    if (related.length < 4) {
      const extraDocs = await accountsCollection
        .find(
          {
            code: { $ne: doc.code, $nin: related.map((r) => r.code) },
            status: 'available',
          },
          { projection: { credentials: 0 } }
        )
        .limit(8 - related.length)
        .toArray();

      related = [
        ...related,
        ...extraDocs.map(
          (d) => serializePublicAccount(d as GameAccountDocument) as unknown as GameAccount
        ),
      ];
    }

    return { account: publicAccount, related };
  } catch (error) {
    console.error('MongoDB query in account detail page failed:', error);
    return { account: null, related: [] };
  }
}

// 3. DYNAMIC METADATA
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { code } = await params;
  const account = await getAccountForMetadata(code);

  if (!account) {
    return { title: 'Tài khoản không tồn tại | GameStore' };
  }

  const cleanCode = account.code.replace(/^#/, '');
  const settings = await getWebsiteSettingsFromDb();
  const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
  const brandName = settings.brandName || settings.siteName || 'GameStore';

  const title = `Mua Nick ${account.gameName || 'Game'} ${account.title} - Mã #${cleanCode} | ${brandName}`;
  const priceFormatted = (account.price || 0).toLocaleString('vi-VN');
  const description = account.description
    ? account.description.slice(0, 155)
    : `Mua tài khoản ${account.gameName || ''} ${account.title} (Mã #${cleanCode}). Giá chỉ ${priceFormatted}₫, bảo hành uy tín, giao dịch tự động 24/7 tại ${brandName}.`;
  
  const canonicalUrl = `${siteUrl}/account/${encodeURIComponent(cleanCode)}`;
  const imageUrl = account.thumbnail || settings.seo?.ogImage?.url;

  const isIndexable = account.status === 'available' || account.status === 'sold';

  return {
    title,
    description,
    keywords: [
      `mua nick ${account.gameName || ''}`,
      `nick #${cleanCode}`,
      account.title,
      account.rank ? `rank ${account.rank}` : '',
      `shop nick ${account.gameName || ''}`,
      'shop acc uy tin',
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: brandName,
      type: 'website',
      locale: 'vi_VN',
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: `${account.title} - Mã #${cleanCode}`,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// 4. PRODUCT DETAIL SSR PAGE
export default async function AccountPage({ params }: PageProps) {
  const { code } = await params;
  const { account, related } = await getAccountByCode(code);

  if (!account) {
    notFound();
  }

  const cleanCode = account.code.replace(/^#/, '');
  const settings = await getWebsiteSettingsFromDb();
  const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
  const brandName = settings.brandName || settings.siteName || 'GameStore';
  const productUrl = `${siteUrl}/account/${encodeURIComponent(cleanCode)}`;

  // PRODUCT SCHEMA.ORG JSON-LD
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${account.title} - #${cleanCode}`,
    description:
      account.description ||
      `Tài khoản game ${account.gameName || ''} chất lượng cao, mã #${cleanCode} tại ${brandName}.`,
    image: [account.thumbnail, ...(account.images || [])].filter(Boolean),
    sku: cleanCode,
    category: account.gameName || 'Game Account',
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    offers: {
      '@type': 'Offer',
      price: account.price,
      priceCurrency: 'VND',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability:
        account.status === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/UsedCondition',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: brandName,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white selection:bg-rose-600">
      <JsonLd data={productSchema} />
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          siteUrl={siteUrl}
          items={[
            ...(account.gameSlug
              ? [
                  {
                    label: `Nick ${account.gameName || account.gameSlug}`,
                    href: `/game/${account.gameSlug}`,
                  },
                ]
              : []),
            {
              label: `Nick #${cleanCode}`,
              href: `/account/${cleanCode}`,
            },
          ]}
        />

        <AccountDetailView account={account} relatedAccounts={related} />
      </main>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Footer />
      </div>
    </div>
  );
}

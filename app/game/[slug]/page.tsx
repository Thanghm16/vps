import React from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AccountCard from '@/components/account/AccountCard';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import JsonLd from '@/components/seo/JsonLd';
import { getGamesCollection, getAccountsCollection, getNewsCollection } from '@/lib/db/collections';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import { serializePublicAccount, GameAccountDocument } from '@/types/db-account';
import { GameAccount } from '@/types/account';
import {
  Gamepad2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
  Award,
  Layers,
  Search,
  Filter,
  ArrowRight,
  PackageOpen,
} from 'lucide-react';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 1. DYNAMIC SEO METADATA
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: 'Danh mục game không tồn tại' };

  try {
    const gamesColl = await getGamesCollection();
    const game = await gamesColl.findOne({ slug: slug.toLowerCase() });

    if (!game) {
      return { title: 'Không tìm thấy danh mục game | GameStore' };
    }

    const settings = await getWebsiteSettingsFromDb();
    const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
    const brandName = settings.brandName || settings.siteName || 'GameStore';

    const title = `Mua Nick ${game.name} Giá Rẻ, Uy Tín, Giao Dịch Tự Động 24/7 | ${brandName}`;
    const description = `Kho tài khoản, nick game ${game.name} VIP giá tốt nhất. Đa dạng tướng, skin, rank cao, thông tin sạch 100%, bảo hành uy tín, nhận nick ngay sau 3 giây qua SePay.`;
    const canonicalUrl = `${siteUrl}/game/${encodeURIComponent(game.slug)}`;
    const ogImageUrl = settings.seo?.ogImage?.url;

    return {
      title,
      description,
      keywords: [
        `mua nick ${game.name}`,
        `shop nick ${game.name}`,
        `acc ${game.name} gia re`,
        `shop acc ${game.name} uy tin`,
        `ban nick ${game.name}`,
        `kho nick ${game.name}`,
      ],
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
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
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Mua Nick Game Uy Tín | GameStore',
      description: 'Kho nick game giá rẻ, giao dịch tự động 24/7.',
    };
  }
}

// 2. SSR GAME LANDING PAGE
export default async function GameLandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  if (!slug) notFound();

  const gamesColl = await getGamesCollection();
  const game = await gamesColl.findOne({ slug: slug.toLowerCase() });

  if (!game) {
    notFound();
  }

  const settings = await getWebsiteSettingsFromDb();
  const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
  const brandName = settings.brandName || settings.siteName || 'GameStore';

  // Lấy danh sách nick của game này (Available)
  const accountsColl = await getAccountsCollection();
  const rawAccounts = await accountsColl
    .find(
      { gameSlug: game.slug, status: 'available' },
      { projection: { credentials: 0 } }
    )
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(30)
    .toArray();

  const accounts: GameAccount[] = rawAccounts.map(
    (doc) => serializePublicAccount(doc as GameAccountDocument) as unknown as GameAccount
  );

  const totalCount = await accountsColl.countDocuments({
    gameSlug: game.slug,
    status: 'available',
  });

  // Lấy các game khác để làm internal linking
  const otherGames = await gamesColl
    .find({ slug: { $ne: game.slug } })
    .limit(6)
    .toArray();

  // Lấy bài viết tin tức/hướng dẫn liên quan nếu có
  const newsColl = await getNewsCollection();
  const relatedNews = await newsColl
    .find(
      {
        $or: [
          { status: 'published' },
          { status: 'scheduled', scheduledAt: { $lte: new Date() } },
        ],
        $and: [
          {
            $or: [
              { title: { $regex: game.name, $options: 'i' } },
              { tags: { $in: [game.name, game.slug] } },
            ],
          },
        ],
      },
      { projection: { content: 0 } }
    )
    .limit(3)
    .toArray();

  // STRUCTURED DATA SCHEMAS
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Shop Mua Bán Nick ${game.name} Uy Tín - Giá Rẻ`,
    url: `${siteUrl}/game/${game.slug}`,
    description: `Tổng hợp ${totalCount} tài khoản nick game ${game.name} đang mở bán tự động tại ${brandName}.`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: accounts.length,
      itemListElement: accounts.slice(0, 10).map((acc, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: acc.title,
        url: `${siteUrl}/account/${acc.code.replace(/^#/, '')}`,
        image: acc.thumbnail,
      })),
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Mua nick ${game.name} tại ${brandName} có an toàn và được bảo hành không?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Tất cả tài khoản ${game.name} tại ${brandName} đều được kiểm duyệt thông tin trắng sạch 100%, bảo hành 1 đổi 1 hoặc hoàn tiền nếu phát sinh lỗi từ hệ thống.`,
        },
      },
      {
        '@type': 'Question',
        name: `Sau khi thanh toán thì bao lâu nhận được tài khoản ${game.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Hệ thống tích hợp cổng thanh toán tự động SePay VietQR. Ngay sau khi chuyển khoản thành công từ 3 - 5 giây, thông tin đăng nhập và mật khẩu sẽ tự động hiển thị trong đơn hàng của bạn.`,
        },
      },
      {
        '@type': 'Question',
        name: `Tôi có thể đổi mật khẩu và liên kết thông tin cá nhân sau khi mua không?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Có, bạn hoàn toàn có thể đổi mật khẩu, cập nhật số điện thoại hoặc email chính chủ ngay sau khi nhận bàn giao tài khoản.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white selection:bg-rose-600">
      <JsonLd data={[collectionSchema, faqSchema]} />
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* 1. BREADCRUMBS */}
        <Breadcrumbs
          siteUrl={siteUrl}
          items={[{ label: `Nick ${game.name}`, href: `/game/${game.slug}` }]}
        />

        {/* 2. HERO LANDING HEADER */}
        <section className="relative rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[#240c22]/90 via-[#180718]/90 to-[#100310] border border-rose-500/20 shadow-2xl shadow-black/80">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Chuyên Mục Game Hot • Giao Dịch Tự Động 24/7</span>
            </div>

            {/* SINGLE H1 HEADING */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Shop Mua Bán Nick{' '}
              <span className="bg-gradient-to-r from-rose-400 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                {game.name}
              </span>{' '}
              Uy Tín, Giá Rẻ
            </h1>

            <p className="text-xs sm:text-sm text-pink-200/70 leading-relaxed">
              Tổng hợp kho tài khoản <strong>{game.name}</strong> VIP cập nhật liên tục mỗi giờ. Đa dạng
              các phân khúc rank, skin hiếm, tướng độc quyền với mức giá ưu đãi nhất thị trường. Bàn giao tự động
              sau 3 giây.
            </p>

            {/* TRUST HIGHLIGHT PILLS */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-pink-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Thông tin sạch 100%</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-pink-100">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Nhận nick sau 3s</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-pink-100">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Bảo hành đổi trả 1-1</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                <Gamepad2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{totalCount} nick đang có sẵn</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. LIVE ACCOUNT INVENTORY SECTION */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 rounded-full bg-rose-500" />
                <span>Danh Sách Nick {game.name} Đang Bán</span>
              </h2>
              <p className="text-xs text-pink-300/60 mt-0.5">
                Hiển thị {accounts.length} / {totalCount} tài khoản phù hợp
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/search?game=${encodeURIComponent(game.slug)}`}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-200 hover:text-white transition flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-rose-400" />
                <span>Bộ Lọc Nâng Cao</span>
              </Link>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-[#180917]/50 border border-white/5 p-6">
              <div className="w-14 h-14 rounded-2xl bg-[#280e25] flex items-center justify-center text-pink-300/40 mx-auto mb-3">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa có tài khoản {game.name} khả dụng</h3>
              <p className="text-xs text-pink-200/60 max-w-sm mx-auto mt-1">
                Kho nick đang được cập nhật thêm tài khoản mới. Bạn có thể quay lại sau ít phút hoặc xem các game khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-4.5">
              {accounts.map((acc) => (
                <AccountCard key={acc.id || acc.code} account={acc} isFavorite={false} />
              ))}
            </div>
          )}
        </section>

        {/* 4. SEO EDITORIAL CONTENT & BUYING GUIDE */}
        <section className="rounded-3xl p-6 sm:p-8 bg-[#160615]/80 border border-white/5 space-y-6 text-xs sm:text-sm text-pink-200/80 leading-relaxed">
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-400" />
              <span>Tại sao nên mua tài khoản {game.name} tại {brandName}?</span>
            </h2>
            <p>
              Việc tự cày cuốc một tài khoản <strong>{game.name}</strong> từ con số 0 đòi hỏi hàng trăm giờ chơi
              cũng như chi phí nạp game không hề nhỏ. Mua nick tại sàn giao dịch tự động <strong>{brandName}</strong>{' '}
              là giải pháp tối ưu giúp bạn sở hữu ngay nick có cấp bậc rank mong muốn, kho tướng phong phú và full
              bộ sưu tập skin giới hạn với mức giá tiết kiệm lên đến 70% so với tự nạp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-white text-xs sm:text-sm">Chọn Nick Ưng Ý</h3>
              <p className="text-xs text-pink-300/60 leading-normal">
                Xem chi tiết thông số rank, tướng, hình ảnh trang phục thực tế minh bạch 100%.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-white text-xs sm:text-sm">Thanh Toán SePay Tự Động</h3>
              <p className="text-xs text-pink-300/60 leading-normal">
                Quét mã VietQR SePay miễn phí giao dịch, số dư và đơn hàng được duyệt trong 3 giây.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-white text-xs sm:text-sm">Bàn Giao & Bảo Hành</h3>
              <p className="text-xs text-pink-300/60 leading-normal">
                Nhận thông tin đăng nhập ngay lập tức. Đổi mật khẩu dễ dàng, hỗ trợ CSKH 24/7.
              </p>
            </div>
          </div>
        </section>

        {/* 5. FAQ SECTION FOR GAME */}
        <section className="rounded-3xl p-6 sm:p-8 bg-[#160615]/80 border border-white/5 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <span>Câu Hỏi Thường Gặp Khi Mua Nick {game.name}</span>
          </h2>

          <div className="divide-y divide-white/5 space-y-2">
            <div className="pt-3 space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-pink-100">
                1. Mua nick {game.name} tại shop có bị tranh chấp hay lấy lại không?
              </h3>
              <p className="text-xs text-pink-200/70 leading-relaxed">
                Tất cả tài khoản {game.name} đều là thông tin sạch, không tranh chấp. Shop cam kết bảo hành đổi trả 1-1
                hoặc hoàn tiền 100% nếu có lỗi phát sinh từ người bán.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-pink-100">
                2. Tôi có thể thanh toán bằng những hình thức nào?
              </h3>
              <p className="text-xs text-pink-200/70 leading-relaxed">
                Shop hỗ trợ chuyển khoản ngân hàng qua mã VietQR SePay tự động (MB Bank, Vietcombank, Techcombank, ACB,
                v.v.) không mất phí và duyệt lệnh 24/7.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-pink-100">
                3. Sau khi nhận nick tôi cần làm gì đầu tiên?
              </h3>
              <p className="text-xs text-pink-200/70 leading-relaxed">
                Bạn nên đăng nhập ngay vào game, kiểm tra đúng thông số như trên website và tiến hành đổi mật khẩu cũng như
                liên kết thông tin bảo mật chính chủ của bạn.
              </p>
            </div>
          </div>
        </section>

        {/* 6. INTERNAL CROSS-LINKING SECTION */}
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span>Khám Phá Các Danh Mục Game Khác</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {otherGames.map((og) => (
              <Link
                key={og.slug}
                href={`/game/${og.slug}`}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/40 text-center transition group flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-pink-100 group-hover:text-rose-300 transition-colors truncate w-full">
                  {og.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
        <Footer />
      </div>
    </div>
  );
}

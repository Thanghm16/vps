import React from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SafeHtmlRenderer from '@/components/news/SafeHtmlRenderer';
import NewsCard from '@/components/news/NewsCard';
import ViewCounterTrigger from '@/components/news/ViewCounterTrigger';
import SocialShareBar from '@/components/news/SocialShareBar';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import JsonLd from '@/components/seo/JsonLd';
import {
  Calendar,
  Clock,
  Eye,
  User,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Tag as TagIcon,
  Sparkles,
  ArrowLeft,
  Share2,
  Newspaper,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { getNewsCollection, getNewsCategoriesCollection } from '@/lib/db/collections';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import { calculateReadingTime } from '@/lib/security/html-sanitizer';
import { Filter } from 'mongodb';
import { NewsDocument } from '@/types/db-news';
import dayjs from 'dayjs';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 1. DYNAMIC SEO METADATA GENERATION
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  if (!rawSlug) return { title: 'Bài viết không tồn tại' };

  const slug = decodeURIComponent(rawSlug).trim();

  try {
    const newsColl = await getNewsCollection();
    const settings = await getWebsiteSettingsFromDb();
    const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');

    const article = await newsColl.findOne({
      slug,
      status: { $in: ['published', 'scheduled'] },
    });

    if (!article) {
      return {
        title: 'Không tìm thấy bài viết | GameStore',
        description: 'Bài viết không tồn tại hoặc đã bị gỡ bỏ.',
      };
    }

    const title = article.metaTitle || article.title;
    const description = article.metaDescription || article.excerpt || article.title;
    const ogImage = article.thumbnail || settings.seo?.ogImage?.url || '/placeholder-game.jpg';
    const canonical = article.canonicalUrl || `${siteUrl}/tin-tuc/${encodeURIComponent(slug)}`;
    const keywords = Array.isArray(article.tags) ? article.tags.join(', ') : article.metaKeywords || '';

    return {
      title,
      description,
      keywords,
      alternates: {
        canonical,
      },
      robots: article.robots || 'index, follow',
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: settings.brandName || settings.siteName || 'GameStore',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'article',
        publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
        modifiedTime: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
        authors: [article.author?.name || 'GameStore'],
        tags: article.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    return {
      title: 'Tin Tức Game | GameStore',
    };
  }
}

// 2. MAIN DETAIL PAGE COMPONENT
export default async function PublicNewsDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  if (!rawSlug) notFound();

  const slug = decodeURIComponent(rawSlug).trim();

  const newsColl = await getNewsCollection();
  const settings = await getWebsiteSettingsFromDb();
  const siteUrl = (settings.siteUrl || 'https://gamestore.vn').replace(/\/$/, '');
  const now = new Date();

  const publicCondition: Filter<NewsDocument> = {
    $or: [
      {
        status: 'published',
        $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
      },
      {
        status: 'scheduled',
        scheduledAt: { $lte: now },
      },
    ],
  };

  const article = await newsColl.findOne({
    slug,
    ...publicCondition,
  });

  if (!article) {
    notFound();
  }

  const currentPublishedAt = article.publishedAt || article.createdAt || new Date();

  // Lấy bài liên quan
  const relatedQuery: Filter<NewsDocument> = {
    _id: { $ne: article._id },
    ...publicCondition,
  };
  if (article.categoryId) {
    relatedQuery.$or = [
      { categoryId: article.categoryId },
      { categorySlug: article.categorySlug },
      { tags: { $in: article.tags || [] } },
    ];
  } else if (article.tags && article.tags.length > 0) {
    relatedQuery.tags = { $in: article.tags };
  }

  const prevFilter: Filter<NewsDocument> = {
    _id: { $ne: article._id },
    ...publicCondition,
    publishedAt: { $lt: currentPublishedAt },
  };

  const nextFilter: Filter<NewsDocument> = {
    _id: { $ne: article._id },
    ...publicCondition,
    publishedAt: { $gt: currentPublishedAt },
  };

  const [relatedArticles, previousArticle, nextArticle] = await Promise.all([
    newsColl
      .find(relatedQuery, { projection: { content: 0 } })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(4)
      .toArray(),

    newsColl.findOne(prevFilter, {
      projection: { title: 1, slug: 1, thumbnail: 1, publishedAt: 1 },
      sort: { publishedAt: -1 },
    }),

    newsColl.findOne(nextFilter, {
      projection: { title: 1, slug: 1, thumbnail: 1, publishedAt: 1 },
      sort: { publishedAt: 1 },
    }),
  ]);

  const readingTime = calculateReadingTime(article.content || article.excerpt || article.title);
  const formattedPublishedDate = article.publishedAt
    ? dayjs(article.publishedAt).format('DD/MM/YYYY HH:mm')
    : article.createdAt
    ? dayjs(article.createdAt).format('DD/MM/YYYY HH:mm')
    : dayjs().format('DD/MM/YYYY HH:mm');

  const articleUrl = `${siteUrl}/tin-tuc/${encodeURIComponent(slug)}`;

  // JSON-LD STRUCTURED DATA SCHEMA (NewsArticle)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    headline: article.title,
    description: article.excerpt || article.title,
    image: article.thumbnail ? [article.thumbnail] : [],
    datePublished: article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : article.createdAt
      ? new Date(article.createdAt).toISOString()
      : new Date().toISOString(),
    dateModified: article.updatedAt
      ? new Date(article.updatedAt).toISOString()
      : article.createdAt
      ? new Date(article.createdAt).toISOString()
      : new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: article.author?.name || 'Ban Biên Tập GameStore',
    },
    publisher: {
      '@type': 'Organization',
      name: settings.brandName || settings.siteName || 'GameStore',
      logo: {
        '@type': 'ImageObject',
        url: settings.logo?.url || `${siteUrl}/logo.png`,
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#0c040b] text-[#fdf2f8] flex flex-col selection:bg-rose-500 selection:text-white">
      {/* 1. JSON-LD STRUCTURED DATA */}
      <JsonLd data={jsonLd} />

      {/* 2. ANTI-SPAM VIEW COUNTER TRIGGER */}
      <ViewCounterTrigger slug={slug} />

      {/* HEADER */}
      <Header />

      {/* 3. MAIN ARTICLE CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          siteUrl={siteUrl}
          items={[
            { label: 'Tin Tức & Cẩm Nang', href: '/tin-tuc' },
            ...(article.categoryName
              ? [
                  {
                    label: article.categoryName,
                    href: `/tin-tuc?category=${article.categorySlug || 'all'}`,
                  },
                ]
              : []),
            { label: article.title },
          ]}
        />

        {/* ARTICLE HEADER INFO */}
        <header className="space-y-4">
          {/* Category Pill + Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={`/tin-tuc?category=${article.categorySlug || 'all'}`}
              className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-950/60 hover:bg-rose-500 transition"
            >
              {article.categoryName || 'Tin Tức'}
            </Link>

            <span className="flex items-center gap-1.5 text-xs text-pink-300/70 font-medium">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>{formattedPublishedDate}</span>
            </span>

            <span className="text-pink-300/40">•</span>

            <span className="flex items-center gap-1.5 text-xs text-pink-300/70 font-medium">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>{readingTime} phút đọc</span>
            </span>

            <span className="text-pink-300/40">•</span>

            <span className="flex items-center gap-1.5 text-xs text-pink-300/70 font-medium font-mono">
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>{(article.views || 0).toLocaleString('vi-VN')} lượt xem</span>
            </span>
          </div>

          {/* Article Main Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Author Badge Bar */}
          <div className="flex items-center justify-between pt-2 pb-4 border-b border-white/10 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-rose-950/50">
                {article.author?.name ? article.author.name.charAt(0).toUpperCase() : 'G'}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  {article.author?.name || 'Ban Biên Tập'}
                </div>
                <div className="text-[11px] text-pink-300/60">Tác giả chuyên mục Game</div>
              </div>
            </div>

            {/* Social Share Buttons */}
            <SocialShareBar url={articleUrl} title={article.title} />
          </div>
        </header>

        {/* EXCERPT CALLOUT BOX */}
        {article.excerpt && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#20091e] to-[#160616] border-l-4 border-rose-500 border-y border-r border-white/8 text-pink-100/90 text-sm sm:text-base font-medium leading-relaxed italic shadow-lg">
            {article.excerpt}
          </div>
        )}

        {/* HERO FEATURED IMAGE */}
        {article.thumbnail && (
          <div className="relative w-full aspect-[16/9] rounded-2xl sm:rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl">
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              unoptimized
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 900px"
            />
          </div>
        )}

        {/* 4. SANITIZED RICH HTML CONTENT BODY */}
        <article className="p-6 sm:p-8 rounded-3xl bg-[#140513]/90 border border-white/10 shadow-2xl backdrop-blur-md">
          <SafeHtmlRenderer content={article.content || ''} />
        </article>

        {/* 5. TAGS CLOUD */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs text-pink-300/60 font-bold flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>Tags bài viết:</span>
            </span>
            {article.tags.map((tag: string, idx: number) => (
              <Link
                key={idx}
                href={`/tin-tuc?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-rose-600/20 border border-white/8 hover:border-rose-500/30 text-pink-200 hover:text-white text-xs font-semibold transition"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* 6. BOTTOM SOCIAL SHARE & CTA */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#2c0f28] to-[#1a0818] border border-rose-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Thấy bài viết hữu ích?</h4>
              <p className="text-xs text-pink-200/60">Chia sẻ ngay cho bạn bè và đồng đội cùng đọc nhé!</p>
            </div>
          </div>
          <SocialShareBar url={articleUrl} title={article.title} />
        </div>

        {/* 7. PREVIOUS / NEXT ARTICLE NAVIGATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {previousArticle ? (
            <Link
              href={`/tin-tuc/${encodeURIComponent(previousArticle.slug)}`}
              className="p-4 rounded-2xl bg-[#180917]/80 hover:bg-[#250d24] border border-white/8 hover:border-rose-500/40 transition group flex flex-col justify-between space-y-2"
            >
              <span className="text-[11px] font-bold text-pink-300/60 flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                <span>Bài trước</span>
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition line-clamp-2">
                {previousArticle.title}
              </h4>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}

          {nextArticle && (
            <Link
              href={`/tin-tuc/${encodeURIComponent(nextArticle.slug)}`}
              className="p-4 rounded-2xl bg-[#180917]/80 hover:bg-[#250d24] border border-white/8 hover:border-rose-500/40 transition group flex flex-col justify-between space-y-2 text-right"
            >
              <span className="text-[11px] font-bold text-pink-300/60 flex items-center justify-end gap-1">
                <span>Bài tiếp theo</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition line-clamp-2">
                {nextArticle.title}
              </h4>
            </Link>
          )}
        </div>

        {/* 8. RELATED ARTICLES SECTION */}
        {relatedArticles.length > 0 && (
          <section className="space-y-5 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Bài Viết Cùng Chuyên Mục</h3>
                <p className="text-xs text-pink-300/60 mt-0.5">Khám phá thêm các cẩm nang hữu ích khác</p>
              </div>
              <Link
                href="/tin-tuc"
                className="text-xs font-bold text-rose-400 hover:text-white transition flex items-center gap-1"
              >
                <span>Xem tất cả</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {relatedArticles.map((art) => (
                <NewsCard
                  key={art._id?.toString() || art.slug}
                  article={{
                    id: art._id?.toString(),
                    title: art.title,
                    slug: art.slug,
                    excerpt: art.excerpt || '',
                    thumbnail: art.thumbnail || '',
                    categoryName: art.categoryName || 'Chung',
                    categorySlug: art.categorySlug || '',
                    author: art.author,
                    status: art.status,
                    isFeatured: art.isFeatured,
                    isPinned: art.isPinned,
                    tags: art.tags || [],
                    views: art.views || 0,
                    publishedAt: art.publishedAt
                      ? typeof art.publishedAt === 'string'
                        ? art.publishedAt
                        : art.publishedAt.toISOString()
                      : null,
                    scheduledAt: null,
                    createdAt: art.createdAt
                      ? typeof art.createdAt === 'string'
                        ? art.createdAt
                        : art.createdAt.toISOString()
                      : new Date().toISOString(),
                    updatedAt: art.updatedAt
                      ? typeof art.updatedAt === 'string'
                        ? art.updatedAt
                        : art.updatedAt.toISOString()
                      : new Date().toISOString(),
                    readingTime: calculateReadingTime(art.excerpt || art.title),
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

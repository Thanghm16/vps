'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, Calendar, User, ArrowUpRight, Sparkles, Pin } from 'lucide-react';
import { NewsClientData } from '@/types/db-news';
import dayjs from 'dayjs';

interface NewsCardProps {
  article: NewsClientData;
  featured?: boolean;
}

export default function NewsCard({ article, featured = false }: NewsCardProps) {
  const publishedDate = article.publishedAt
    ? dayjs(article.publishedAt).format('DD/MM/YYYY')
    : dayjs(article.createdAt).format('DD/MM/YYYY');

  return (
    <Link
      href={`/tin-tuc/${article.slug}`}
      className={`group relative flex flex-col rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1c081c]/90 via-[#150615]/90 to-[#0e030e] hover:from-[#290c27] hover:via-[#200820] hover:to-[#140414] border border-white/10 hover:border-rose-500/50 p-3.5 sm:p-4 shadow-xl hover:shadow-2xl hover:shadow-rose-950/60 transition-all duration-300 hover:-translate-y-1.5 select-none block overflow-hidden ${
        featured ? 'ring-1 ring-rose-500/30' : ''
      }`}
    >
      {/* 1. THUMBNAIL IMAGE (16:10 Aspect) */}
      <div className="relative w-full aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
        <Image
          src={article.thumbnail || '/placeholder-game.jpg'}
          alt={article.title}
          fill
          unoptimized
          className="object-cover object-center group-hover:scale-108 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white shadow-md">
            {article.categoryName || 'Tin Tức'}
          </span>

          <div className="flex items-center gap-1.5">
            {article.isPinned && (
              <span className="p-1.5 rounded-full bg-rose-600/90 text-white backdrop-blur-md shadow-md" title="Bài viết được ghim">
                <Pin className="w-3 h-3" />
              </span>
            )}
            {article.isFeatured && (
              <span className="p-1.5 rounded-full bg-amber-500/90 text-white backdrop-blur-md shadow-md" title="Bài viết nổi bật">
                <Sparkles className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Bottom Time Badge */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-pink-200/90 font-medium z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-rose-400" />
            <span>{publishedDate}</span>
          </span>

          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1">
            <Clock className="w-3 h-3 text-pink-400" />
            <span>{article.readingTime || 2} phút đọc</span>
          </span>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="pt-3.5 pb-1 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-rose-300 transition-colors line-clamp-2 leading-snug tracking-tight">
            {article.title}
          </h3>
          <p className="text-xs text-pink-200/65 line-clamp-2 leading-relaxed mt-1.5">
            {article.excerpt || article.title}
          </p>
        </div>

        {/* 3. FOOTER INFO */}
        <div className="pt-3 border-t border-white/8 flex items-center justify-between text-xs text-pink-300/60 mt-auto">
          {/* Author */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white text-[9px] font-black shrink-0">
              {article.author?.name ? article.author.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <span className="truncate text-[11px] font-medium text-pink-200/80">
              {article.author?.name || 'GameStore'}
            </span>
          </div>

          {/* Views & Arrow */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-mono text-pink-300/70">
              <Eye className="w-3.5 h-3.5 text-pink-400" />
              <span>{(article.views || 0).toLocaleString('vi-VN')}</span>
            </span>

            <div className="w-6 h-6 rounded-full bg-white/5 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center text-pink-300/60 transition-all">
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

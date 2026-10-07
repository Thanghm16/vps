'use client';

import React, { useState } from 'react';
import { Globe, Smartphone, Monitor } from 'lucide-react';

interface SeoPreviewBoxProps {
  title: string;
  slug: string;
  description: string;
  siteUrl?: string;
}

export default function SeoPreviewBox({
  title,
  slug,
  description,
  siteUrl = 'https://gamestore.vn',
}: SeoPreviewBoxProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const displayTitle = title.trim() || 'Tiêu đề bài viết sẽ hiển thị ở đây';
  const displaySlug = slug.trim() || 'tieu-de-bai-viet';
  const displayDesc = description.trim() || 'Mô tả ngắn của bài viết sẽ hiển thị ở đây để thu hút người dùng từ Google Search...';
  const fullUrl = `${siteUrl.replace(/\/$/, '')}/tin-tuc/${displaySlug}`;

  return (
    <div className="rounded-2xl bg-[#140513] border border-white/10 p-4 sm:p-5 space-y-3 shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Globe className="w-4 h-4 text-rose-400" />
          <span>Xem Trước Kết Quả Tìm Kiếm Google (SEO Preview)</span>
        </div>

        <div className="flex items-center bg-[#1c081c] rounded-xl p-0.5 border border-white/10">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              device === 'desktop' ? 'bg-rose-600 text-white shadow-sm' : 'text-pink-300/60 hover:text-white'
            }`}
            title="Xem giao diện Máy tính"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">Máy tính</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              device === 'mobile' ? 'bg-rose-600 text-white shadow-sm' : 'text-pink-300/60 hover:text-white'
            }`}
            title="Xem giao diện Điện thoại"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">Điện thoại</span>
          </button>
        </div>
      </div>

      {/* GOOGLE SEARCH CARD SIMULATION */}
      <div
        className={`p-4 rounded-xl transition-all ${
          device === 'desktop'
            ? 'bg-[#202124] border border-[#3c4043] max-w-2xl'
            : 'bg-[#202124] border border-[#3c4043] max-w-sm mx-auto shadow-2xl'
        }`}
      >
        {/* Favicon & Breadcrumb Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
            G
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-normal text-[#dadce0] truncate leading-tight">
              GameStore
            </span>
            <span className="text-[11px] text-[#9aa0a6] truncate font-sans leading-tight">
              {fullUrl}
            </span>
          </div>
        </div>

        {/* SEO Clickable Title */}
        <h4 className="text-[#8ab4f8] text-base sm:text-lg font-medium hover:underline cursor-pointer line-clamp-1 leading-snug">
          {displayTitle}
        </h4>

        {/* SEO Snippet Description */}
        <p className="text-[#bdc1c6] text-xs sm:text-sm mt-1 line-clamp-2 leading-relaxed">
          {displayDesc}
        </p>
      </div>

      {/* CHARACTER COUNTERS FEEDBACK */}
      <div className="flex items-center justify-between text-[11px] text-pink-300/60 pt-1">
        <span>
          Độ dài Tiêu đề: <strong className={displayTitle.length > 60 ? 'text-amber-400' : 'text-emerald-400'}>{displayTitle.length}/60</strong> ký tự
        </span>
        <span>
          Độ dài Mô tả: <strong className={displayDesc.length > 160 ? 'text-amber-400' : 'text-emerald-400'}>{displayDesc.length}/160</strong> ký tự
        </span>
      </div>
    </div>
  );
}

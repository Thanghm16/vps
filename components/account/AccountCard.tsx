'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GameAccount } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import {
  Heart,
  ShieldCheck,
  ChevronRight,
  Flame,
  Award,
  Eye,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AccountCardProps {
  account: GameAccount;
  isFavorite: boolean;
  onToggleFavorite?: (code: string) => void;
  onSelectAccount?: (code: string) => void;
}

export default function AccountCard({
  account,
  isFavorite,
  onToggleFavorite,
  onSelectAccount,
}: AccountCardProps) {
  const cleanCode = encodeURIComponent(account.code.replace('#', ''));

  // Trích xuất thông số hiển thị đẹp
  const details = (account.details || {}) as Record<string, unknown>;
  const rank = account.rank || (details['Rank'] as string) || (details['rank'] as string);
  const heroCount = account.heroCount || (details['Số tướng'] as number) || (details['Tướng'] as number);
  const skinCount = account.skinCount || (details['Số trang phục'] as number) || (details['Skin'] as number);
  const views = account.views || (details['Lượt xem'] as number) || (details['views'] as number) || Math.floor(Math.random() * 800 + 120);

  // Tính phần trăm giảm giá nếu có
  const hasDiscount = account.originalPrice && account.originalPrice > account.price;
  const discountPercent =
    account.discountPercent ||
    (hasDiscount ? Math.round(((account.originalPrice - account.price) / account.originalPrice) * 100) : 0);

  const handleClick = () => {
    if (onSelectAccount) {
      onSelectAccount(account.code);
    }
  };

  return (
    <Link
      href={`/account/${cleanCode}`}
      onClick={handleClick}
      className="group relative flex flex-col rounded-2xl bg-gradient-to-b from-[#1c081c]/95 via-[#150615]/95 to-[#0e030e] hover:from-[#290c27] hover:via-[#200820] hover:to-[#140414] border border-white/10 hover:border-rose-500/50 p-3 sm:p-3.5 shadow-xl hover:shadow-2xl hover:shadow-rose-950/60 transition-all duration-300 hover:-translate-y-1.5 select-none active:scale-[0.98] block overflow-hidden"
    >
      {/* 1. TOP IMAGE PREVIEW WITH BADGES & OVERLAYS (Cinematic 16:10 aspect) */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-black/60 border border-white/10 group/thumb shrink-0">
        <Image
          src={account.thumbnail || '/placeholder-game.jpg'}
          alt={account.title}
          fill
          className="object-cover object-center group-hover:scale-108 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
        />

        {/* Gradient Shadow Overlay on image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

        {/* TOP ROW BADGES: Game Badge + Favorite Heart */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          {/* Game Pill */}
          <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span className="truncate max-w-[100px]">{account.gameName || 'Game VIP'}</span>
          </span>

          {/* Favorite Heart Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(account.code);
              }}
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:text-rose-500 hover:scale-110 active:scale-125 transition-all shadow-md cursor-pointer"
              aria-label="Lưu nick yêu thích"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/80'
                }`}
              />
            </button>
          )}
        </div>

        {/* BOTTOM ROW ON IMAGE: Account Code & Guarantee/Sale Tag */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-white/15 text-pink-200 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider shadow-sm">
            {account.code}
          </span>

          {discountPercent > 0 ? (
            <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[9px] sm:text-[10px] font-black tracking-wider shadow-md flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 fill-current" />
              <span>-{discountPercent}%</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>Sạch 100%</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. CARD CONTENT BODY (Balanced Spacing) */}
      <div className="pt-2.5 pb-0.5 flex flex-col flex-1 justify-between gap-2">
        {/* Title */}
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors line-clamp-2 leading-snug tracking-tight">
            {account.title}
          </h3>
        </div>

        {/* Stats Chips Row */}
        <div className="flex items-center gap-1 flex-wrap">
          {rank && (
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 shadow-sm">
              <Award className="w-3 h-3 text-purple-400" />
              <span>{rank}</span>
            </span>
          )}

          {heroCount ? (
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-pink-200/90 text-[10px] sm:text-[11px] font-medium">
              {heroCount} Tướng
            </span>
          ) : null}

          {skinCount ? (
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-pink-200/90 text-[10px] sm:text-[11px] font-medium">
              {skinCount} Skin
            </span>
          ) : null}

          {account.highlights && account.highlights.length > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-medium truncate max-w-[110px] flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-rose-400 shrink-0" />
              <span className="truncate">{account.highlights[0]}</span>
            </span>
          )}

          {/* Views count */}
          <span className="px-1.5 py-0.5 rounded-lg bg-black/30 text-pink-300/60 text-[10px] font-medium ml-auto flex items-center gap-1">
            <Eye className="w-2.5 h-2.5 text-pink-300/50" />
            <span>{views}</span>
          </span>
        </div>

        {/* 3. FOOTER: PRICE & CTA BUTTON */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
          {/* Price Column */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 font-mono tracking-tight truncate">
              {formatPrice(account.price)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-zinc-500 line-through font-mono -mt-0.5">
                {formatPrice(account.originalPrice)}
              </span>
            )}
          </div>

          {/* Action Pill Button */}
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl btn-gradient-hero text-white text-[11px] sm:text-xs font-bold shadow-md shadow-rose-950/60 flex items-center gap-1 group-hover:scale-105 group-hover:shadow-rose-600/30 transition-all shrink-0 cursor-pointer">
            <span>Chi tiết</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

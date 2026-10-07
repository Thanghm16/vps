'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GameAccount } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import { Star, Heart } from 'lucide-react';

interface PopularAccountsProps {
  accounts: GameAccount[];
  onSelectAccount?: (code: string) => void;
  favorites: string[];
  onToggleFavorite?: (code: string) => void;
  onViewAll?: () => void;
}

export default function PopularAccounts({
  accounts,
  onSelectAccount,
  favorites,
  onToggleFavorite,
  onViewAll,
}: PopularAccountsProps) {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Nick Hot Hôm Nay
        </h2>
        <button
          onClick={onViewAll}
          className="text-xs sm:text-sm font-medium text-pink-300/60 hover:text-pink-300 transition"
        >
          Xem tất cả
        </button>
      </div>

      {/* 5 POPULAR ITEMS LIST */}
      <div className="flex flex-col gap-3">
        {accounts.slice(0, 5).map((account) => {
          const isFav = favorites.includes(account.code);
          const cleanCode = encodeURIComponent(account.code.replace('#', ''));

          return (
            <Link
              key={account.id}
              href={`/account/${cleanCode}`}
              onClick={() => onSelectAccount?.(account.code)}
              className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#190918]/60 hover:bg-[#250d23]/80 border border-white/5 hover:border-rose-500/30 transition-all duration-300 group cursor-pointer active:scale-[0.98] select-none block"
            >
              {/* Left: Square Thumbnail + Favorite Overlay */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
                <Image
                  src={account.thumbnail}
                  alt={account.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="64px"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite?.(account.code);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/40 backdrop-blur-sm text-white hover:text-rose-500 transition cursor-pointer z-10"
                  aria-label="Yêu thích"
                >
                  <Heart
                    className={`w-3 h-3 ${
                      isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80'
                    }`}
                  />
                </button>
              </div>

              {/* Middle: Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-rose-300 transition">
                  {account.title}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#34122d] text-pink-200 border border-white/5">
                    {account.gameName}
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{account.rating || '4.9'}</span>
                  </div>
                </div>
              </div>

              {/* Right: Price Pill Button */}
              <div className="flex-shrink-0">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold text-pink-100 bg-[#35132f] border border-rose-500/20 group-hover:bg-gradient-to-r group-hover:from-rose-600 group-hover:to-purple-600 transition-all shadow-sm">
                  {formatPrice(account.price)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

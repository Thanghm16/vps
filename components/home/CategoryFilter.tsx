'use client';

import React from 'react';
import Link from 'next/link';
import { GameCategory } from '@/types/account';
import { ExternalLink } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
  title?: string;
  categories?: { id: string; name: string }[];
  isLoading?: boolean;
}

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  title = 'Danh mục game',
  categories = [],
  isLoading = false,
}: CategoryFilterProps) {
  const tabs = categories && categories.length > 0 ? categories : [{ id: 'all', name: 'Tất cả' }];

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-4">
      {/* Title with optional Landing Page Link */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          {title}
        </h2>
        {selectedCategory !== 'all' && (
          <Link
            href={`/game/${selectedCategory}`}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition flex items-center gap-1"
            title={`Xem trang chuyên mục ${selectedCategory}`}
          >
            <span>Trang Game</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Horizontal Tabs List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
        {isLoading ? (
          <div className="flex items-center gap-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-white/5 rounded-full" />
            ))}
          </div>
        ) : (
          tabs.map((tab) => {
            const isActive = selectedCategory === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectCategory(tab.id as GameCategory)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'tab-active ring-1 ring-white/30 scale-105'
                    : 'bg-[#260e22]/70 text-pink-200/70 hover:text-white hover:bg-[#381433] border border-white/5'
                }`}
              >
                {tab.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

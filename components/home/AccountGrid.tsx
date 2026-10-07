'use client';

import React from 'react';
import { GameAccount } from '@/types/account';
import AccountCard from '@/components/account/AccountCard';
import { PackageOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface AccountGridProps {
  accounts: GameAccount[];
  favorites: string[];
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  totalAccounts?: number;
  onPageChange?: (page: number) => void;
  onToggleFavorite: (code: string) => void;
  onSelectAccount: (code: string) => void;
}

export default function AccountGrid({
  accounts,
  favorites,
  isLoading = false,
  page = 1,
  totalPages = 1,
  totalAccounts = 0,
  onPageChange,
  onToggleFavorite,
  onSelectAccount,
}: AccountGridProps) {
  // 1. Loading Skeleton State (khi đang fetch từ MongoDB)
  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-4.5 w-full">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl bg-[#180817]/80 border border-white/5 p-3 sm:p-3.5 space-y-3 animate-pulse"
            >
              <div className="w-full aspect-[16/10] rounded-xl bg-white/8 shrink-0" />
              <div className="space-y-2 py-0.5 flex-1">
                <div className="h-3.5 bg-white/10 rounded-lg w-4/5" />
                <div className="h-3 bg-white/5 rounded-lg w-3/5" />
                <div className="flex items-center gap-1.5 pt-1.5">
                  <div className="h-5 bg-purple-500/10 rounded-lg w-16" />
                  <div className="h-5 bg-white/5 rounded-lg w-14" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="h-4 bg-rose-500/20 rounded-lg w-20" />
                <div className="h-7 bg-rose-600/20 rounded-xl w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (accounts.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-[#180917]/50 border border-white/5 my-4">
        <div className="w-14 h-14 rounded-2xl bg-[#280e25] flex items-center justify-center text-pink-300/40 mb-3">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">Chưa có tài khoản nào</h3>
        <p className="text-xs text-pink-200/60 max-w-sm mt-1">
          Kho nick đang được cập nhật hoặc không tìm thấy kết quả phù hợp với bộ lọc hiện tại.
        </p>
      </div>
    );
  }

  // Generate pagination pages window
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  // 3. Data Grid with Modern Pagination
  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-4.5 w-full">
        {accounts.map((acc) => (
          <AccountCard
            key={acc.id || acc.code}
            account={acc}
            isFavorite={favorites.includes(acc.code)}
            onToggleFavorite={onToggleFavorite}
            onSelectAccount={onSelectAccount}
          />
        ))}
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#180917]/80 border border-white/5 shadow-lg mt-4">
          <div className="text-xs text-pink-200/60 font-medium">
            Hiển thị <strong>{accounts.length}</strong> / <strong>{totalAccounts.toLocaleString('vi-VN')}</strong> nick • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* First Page */}
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 cursor-pointer"
              title="Trang đầu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-xs font-semibold text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            {/* Page Number Buttons */}
            {getPageNumbers().map((pNum, idx) => {
              if (pNum === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-xs text-pink-300/40">
                    ...
                  </span>
                );
              }

              const isCurrent = pNum === page;
              return (
                <button
                  key={`page-${pNum}`}
                  type="button"
                  onClick={() => onPageChange(Number(pNum))}
                  className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white border border-white/5'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-xs font-semibold text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 flex items-center gap-1 cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 cursor-pointer"
              title="Trang cuối"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

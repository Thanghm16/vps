'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, ShoppingBag, WalletCards, Image as ImageIcon, Zap } from 'lucide-react';

interface QuickActionButtonsProps {
  onAddNewAccount?: () => void;
  onAddNewBanner?: () => void;
}

export default function QuickActionButtons({
  onAddNewAccount,
  onAddNewBanner,
}: QuickActionButtonsProps) {
  return (
    <div className="p-5 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md shadow-rose-600/30">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Thao Tác Nhanh
          </h4>
          <p className="text-[11px] text-pink-200/50">
            Các lối tắt quản trị viên thường dùng nhất
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onAddNewAccount}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition transform hover:-translate-y-0.5"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Thêm nick</span>
        </button>

        <button
          type="button"
          onClick={onAddNewBanner}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-200 hover:text-white transition"
        >
          <ImageIcon className="w-3.5 h-3.5 text-pink-300" />
          <span>+ Tạo banner</span>
        </button>

        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-200 hover:text-white transition"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
          <span>Xem đơn hàng</span>
        </Link>

        <Link
          href="/admin/transactions"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-200 hover:text-white transition"
        >
          <WalletCards className="w-3.5 h-3.5 text-emerald-400" />
          <span>Xem giao dịch</span>
        </Link>
      </div>
    </div>
  );
}

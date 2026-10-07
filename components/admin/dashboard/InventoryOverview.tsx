'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ArrowRight, CheckCircle2, Clock, EyeOff, Layers } from 'lucide-react';

interface InventoryOverviewProps {
  availableCount?: number;
  soldCount?: number;
  reservedCount?: number;
  hiddenCount?: number;
  isLoading?: boolean;
}

export default function InventoryOverview({
  availableCount = 0,
  soldCount = 0,
  reservedCount = 0,
  hiddenCount = 0,
  isLoading = false,
}: InventoryOverviewProps) {
  const total = availableCount + soldCount + reservedCount + hiddenCount;

  const getPercent = (count: number) => {
    if (total === 0) return '0%';
    const pct = Math.round((count / total) * 100);
    return `${pct}%`;
  };

  const inventoryItems = [
    {
      label: 'Đang Bán Sẵn Sàng',
      count: availableCount,
      percentage: getPercent(availableCount),
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: Package,
    },
    {
      label: 'Đã Bàn Giao Thành Công',
      count: soldCount,
      percentage: getPercent(soldCount),
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      icon: CheckCircle2,
    },
    {
      label: 'Đang Giữ Chờ Thanh Toán',
      count: reservedCount,
      percentage: getPercent(reservedCount),
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Clock,
    },
    {
      label: 'Tạm Ẩn Bảo Trì / Soát Lại',
      count: hiddenCount,
      percentage: getPercent(hiddenCount),
      color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
      icon: EyeOff,
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Tình Trạng Kho Nick
            </h3>
            <p className="text-xs text-pink-200/60 mt-0.5">
              Phân bổ trạng thái {total.toLocaleString('vi-VN')} tài khoản trong hệ thống
            </p>
          </div>
        </div>

        <Link
          href="/admin/accounts"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-rose-600/20 text-xs font-bold text-pink-200 hover:text-white border border-white/10 hover:border-rose-500/30 transition"
        >
          <span>Xem kho nick</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3.5 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {inventoryItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#1c081a]/50 border border-white/5 hover:border-white/15 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl border ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-pink-300/40">
                    {item.percentage}
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-white">
                  {item.count.toLocaleString('vi-VN')}
                </div>
                <div className="text-xs text-pink-200/70 font-semibold mt-0.5">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

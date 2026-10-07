'use client';

import React, { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { RevenueChartPoint } from '@/types/admin';
import { BarChart3 } from 'lucide-react';

interface RevenueChartProps {
  data7d?: RevenueChartPoint[];
  data30d?: RevenueChartPoint[];
  data12m?: RevenueChartPoint[];
  isLoading?: boolean;
}

export default function RevenueChart({
  data7d = [],
  data30d = [],
  data12m = [],
  isLoading = false,
}: RevenueChartProps) {
  const [range, setRange] = useState<'7d' | '30d' | '12m'>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<RevenueChartPoint | null>(null);

  const dataMap = {
    '7d': data7d,
    '30d': data30d,
    '12m': data12m,
  };

  const currentData = dataMap[range];
  const maxRevenue = Math.max(1, ...currentData.map((d) => d.revenue));
  const totalRevenue = currentData.reduce((acc, cur) => acc + cur.revenue, 0);
  const totalOrders = currentData.reduce((acc, cur) => acc + cur.orders, 0);

  return (
    <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl flex flex-col justify-between">
      {/* HEADER & TIME SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Biểu Đồ Doanh Thu & Đơn Hàng
              </h3>
              <p className="text-xs text-pink-200/60 mt-0.5">
                Theo dõi hiệu quả kinh doanh marketplace theo thời gian
              </p>
            </div>
          </div>
        </div>

        {/* TIME FILTER BUTTONS */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#200a1d] border border-white/5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              range === '7d'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-pink-300/60 hover:text-white'
            }`}
          >
            7 Ngày
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              range === '30d'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-pink-300/60 hover:text-white'
            }`}
          >
            30 Ngày
          </button>
          <button
            type="button"
            onClick={() => setRange('12m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              range === '12m'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-pink-300/60 hover:text-white'
            }`}
          >
            12 Tháng
          </button>
        </div>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-5 p-4 rounded-2xl bg-[#1c081a]/60 border border-white/5">
        <div>
          <div className="text-[11px] text-pink-300/60 font-semibold uppercase tracking-wider">
            Tổng Doanh Thu Kỳ Này
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-400 mt-0.5">
            {formatPrice(totalRevenue)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-pink-300/60 font-semibold uppercase tracking-wider">
            Tổng Đơn Hoàn Tất
          </div>
          <div className="text-lg sm:text-xl font-black text-white mt-0.5">
            {totalOrders.toLocaleString('vi-VN')} đơn
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <div className="text-[11px] text-pink-300/60 font-semibold uppercase tracking-wider">
            Giá Trị TB / Đơn
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">
            {formatPrice(Math.round(totalRevenue / (totalOrders || 1)))}
          </div>
        </div>
      </div>

      {/* SVG INTERACTIVE BAR / AREA CHART */}
      <div className="relative pt-6 pb-2">
        {isLoading ? (
          <div className="h-48 sm:h-56 bg-white/5 rounded-2xl animate-pulse" />
        ) : currentData.length === 0 ? (
          <div className="h-48 sm:h-56 flex items-center justify-center text-xs text-pink-300/40 border border-white/5 rounded-2xl">
            Chưa có dữ liệu biểu đồ trong kỳ này
          </div>
        ) : (
          <div>
            <div className="h-8 mb-2 flex items-center justify-between text-xs">
              {hoveredPoint ? (
                <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200">
                  <span className="font-bold text-white">{hoveredPoint.label}:</span>
                  <span>Doanh thu: <strong>{formatPrice(hoveredPoint.revenue)}</strong></span>
                  <span>• {hoveredPoint.orders} đơn hàng</span>
                </div>
              ) : (
                <span className="text-[11px] text-pink-300/40 italic">
                  Rê chuột vào các cột để xem chi tiết doanh thu từng mốc
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-2 sm:gap-3 h-48 sm:h-56 px-2 border-b border-white/10">
              {currentData.map((item, idx) => {
                const heightPercent = Math.max(12, Math.round((item.revenue / maxRevenue) * 100));
                const isHovered = hoveredPoint?.label === item.label;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(item)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 relative ${
                        isHovered
                          ? 'bg-gradient-to-t from-rose-600 via-pink-500 to-purple-400 shadow-lg shadow-rose-600/40'
                          : 'bg-gradient-to-t from-rose-900/40 via-rose-700/60 to-rose-500/80 group-hover:from-rose-800/80 group-hover:to-pink-500'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white/90 mx-auto -mt-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <span className="text-[10px] sm:text-xs text-pink-300/50 group-hover:text-white font-medium mt-2 truncate w-full text-center">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

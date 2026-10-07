'use client';

import React from 'react';
import { formatPrice } from '@/lib/utils';
import { GameSalesMetric } from '@/types/admin';
import { Gamepad2 } from 'lucide-react';

interface SalesByGameProps {
  games?: GameSalesMetric[];
  isLoading?: boolean;
}

export default function SalesByGame({ games = [], isLoading = false }: SalesByGameProps) {
  return (
    <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Doanh Số Theo Tựa Game
            </h3>
            <p className="text-xs text-pink-200/60 mt-0.5">
              Phân bổ số nick bán và doanh thu thực tế
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          {games.length} Danh mục
        </span>
      </div>

      {/* GAME RANKING ITEMS */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl w-full" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-pink-300/40 border border-white/5 rounded-2xl">
          Chưa có thống kê doanh số theo game
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((game, idx) => (
            <div
              key={game.gameId}
              className="p-3.5 rounded-2xl bg-[#1c081a]/50 hover:bg-[#230a21] border border-white/5 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-rose-300 transition">
                    {game.gameName}
                  </span>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs sm:text-sm font-black text-white">
                    {formatPrice(game.revenue)}
                  </div>
                  <div className="text-[10px] text-pink-300/60">
                    {game.accountsSold} nick đã bán
                  </div>
                </div>
              </div>

              {/* Custom Progress Bar */}
              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden relative">
                <div
                  style={{ width: `${game.percentage}%` }}
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                    idx === 0
                      ? 'from-rose-600 to-pink-500'
                      : idx === 1
                      ? 'from-purple-600 to-indigo-500'
                      : idx === 2
                      ? 'from-amber-500 to-yellow-400'
                      : 'from-emerald-500 to-teal-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-pink-300/40 mt-1.5 font-medium">
                <span>Thị phần sàn</span>
                <span className="font-bold text-white">{game.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

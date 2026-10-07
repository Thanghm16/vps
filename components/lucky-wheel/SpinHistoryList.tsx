'use client';

import React, { useState } from 'react';
import { Trophy, History, Coins, Gamepad2, TicketPercent, RotateCw, Gift, Frown, CheckCircle2, Clock } from 'lucide-react';
import { RewardType } from '@/types/lucky-wheel';

interface WinnerItem {
  id: string;
  username: string;
  rewardName: string;
  rewardType: RewardType;
  rewardValue: number;
  rewardImage?: string;
  wheelName: string;
  createdAt: string;
}

interface UserSpinItem {
  id: string;
  rewardId: string;
  rewardName: string;
  rewardType: RewardType;
  rewardValue: number;
  rewardImage?: string;
  spinNumber: number;
  cost: number;
  costType: 'free' | 'bonus' | 'wallet';
  status: string;
  claimStatus: string;
  claimDetails?: Record<string, any>;
  createdAt: string;
}

interface SpinHistoryListProps {
  recentWinners: WinnerItem[];
  userHistory: UserSpinItem[];
  isAuthenticated: boolean;
  onRefresh?: () => void;
}

export default function SpinHistoryList({
  recentWinners,
  userHistory,
  isAuthenticated,
}: SpinHistoryListProps) {
  const [activeTab, setActiveTab] = useState<'winners' | 'personal'>('winners');

  const getRewardBadge = (type: RewardType, name: string) => {
    switch (type) {
      case 'ACCOUNT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Gamepad2 className="w-3 h-3" />
            {name}
          </span>
        );
      case 'COUPON':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <TicketPercent className="w-3 h-3" />
            {name}
          </span>
        );
      case 'MONEY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Coins className="w-3 h-3" />
            {name}
          </span>
        );
      case 'EXTRA_SPIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <RotateCw className="w-3 h-3" />
            {name}
          </span>
        );
      case 'PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
            <Gift className="w-3 h-3" />
            {name}
          </span>
        );
      case 'NOTHING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-zinc-300 border border-white/10">
            <Frown className="w-3 h-3" />
            {name}
          </span>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const diff = Math.floor((now.getTime() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return 'Vừa xong';
      if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-3xl bg-[#180718]/90 border border-white/10 p-5 shadow-2xl backdrop-blur-xl flex flex-col h-[480px]">
      {/* TABS HEADER */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-black/40 border border-white/8 mb-4">
        <button
          onClick={() => setActiveTab('winners')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'winners'
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-950/40'
              : 'text-pink-300/60 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Trúng Thưởng Mới Nhất</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-950/40'
              : 'text-pink-300/60 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Lịch Sử Của Bạn</span>
        </button>
      </div>

      {/* CONTENT LIST */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-rose-600/30">
        {activeTab === 'winners' ? (
          recentWinners && recentWinners.length > 0 ? (
            recentWinners.map((winner, idx) => (
              <div
                key={winner.id || idx}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600/30 to-purple-600/30 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {winner.username}
                    </span>
                    <span className="text-[10px] text-pink-300/50 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(winner.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {getRewardBadge(winner.rewardType, winner.rewardName)}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <Trophy className="w-10 h-10 text-pink-300/20 mb-2" />
              <span className="text-xs font-semibold text-pink-300/60">
                Chưa có ai quay trúng thưởng gần đây.
              </span>
              <span className="text-[11px] text-pink-300/40 mt-1">
                Hãy là người may mắn đầu tiên!
              </span>
            </div>
          )
        ) : !isAuthenticated ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <History className="w-10 h-10 text-pink-300/20 mb-2" />
            <span className="text-xs font-semibold text-pink-300/60">
              Vui lòng đăng nhập để xem lịch sử quay
            </span>
          </div>
        ) : userHistory && userHistory.length > 0 ? (
          userHistory.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-pink-200">
                  #{item.spinNumber || idx + 1}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    {item.rewardName}
                  </span>
                  <span className="text-[10px] text-pink-300/50 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {getRewardBadge(item.rewardType, item.rewardName)}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <History className="w-10 h-10 text-pink-300/20 mb-2" />
            <span className="text-xs font-semibold text-pink-300/60">
              Bạn chưa thực hiện lượt quay nào.
            </span>
            <span className="text-[11px] text-pink-300/40 mt-1">
              Bấm &quot;Quay Ngay&quot; để thử vận may của bạn!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

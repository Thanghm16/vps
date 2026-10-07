'use client';

import React from 'react';
import Image from 'next/image';
import { TopDepositor } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import { Trophy, Crown, Sparkles, Zap, ChevronRight, UserCheck } from 'lucide-react';

interface TopDepositsProps {
    depositors?: TopDepositor[];
    isLoading?: boolean;
    onRechargeClick?: () => void;
}

export default function TopDeposits({ depositors = [], isLoading = false, onRechargeClick }: TopDepositsProps) {
    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1:
                return (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/40">
                        <Crown className="w-3.5 h-3.5" />
                    </div>
                );
            case 2:
                return (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-300 to-zinc-100 text-slate-900 flex items-center justify-center font-black text-xs shadow-md shadow-slate-400/30">
                        2
                    </div>
                );
            case 3:
                return (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-md shadow-amber-700/30">
                        3
                    </div>
                );
            default:
                return (
                    <div className="w-6 h-6 rounded-full bg-[#2c1228] text-pink-300/70 border border-white/5 flex items-center justify-center font-bold text-xs">
                        {rank}
                    </div>
                );
        }
    };

    const getAvatarRing = (rank: number) => {
        switch (rank) {
            case 1:
                return 'ring-2 ring-amber-400 shadow-md shadow-amber-500/30';
            case 2:
                return 'ring-2 ring-slate-300 shadow-md shadow-slate-400/20';
            case 3:
                return 'ring-2 ring-amber-600 shadow-md shadow-amber-700/20';
            default:
                return 'ring-1 ring-white/10';
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-5 rounded-[28px] bg-[#1a0a18]/80 backdrop-blur-xl border border-white/10 shadow-xl">
            {/* HEADER */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                            Top Nạp Tiền
                        </h2>
                        <div className="text-[10px] text-pink-300/60 font-medium">Bảng xếp hạng tháng</div>
                    </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#2d1127] text-amber-400 border border-amber-400/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Đua Top VIP</span>
                </span>
            </div>

            {/* BODY LIST */}
            {isLoading ? (
                <div className="flex flex-col gap-2.5 my-3 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 bg-white/5 rounded-2xl w-full" />
                    ))}
                </div>
            ) : depositors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center my-auto">
                    <UserCheck className="w-8 h-8 text-pink-300/30 mb-2" />
                    <span className="text-xs font-bold text-white">Chưa có giao dịch top nạp</span>
                    <span className="text-[10px] text-pink-200/50 mt-0.5">
                        Hãy là người đầu tiên đua top tháng này!
                    </span>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5 mt-3">
                    {depositors.slice(0, 5).map((user) => (
                        <div
                            key={user.rank}
                            className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-[#1d091a]/60 hover:bg-[#280e25]/80 border border-white/5 hover:border-amber-500/30 transition-all duration-300 group"
                        >
                            {/* Rank Number & Avatar */}
                            <div className="flex items-center gap-2.5">
                                {getRankBadge(user.rank)}

                                <div
                                    className={`relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-black/40 ${getAvatarRing(user.rank)}`}
                                >
                                    <Image
                                        src={user.avatar}
                                        alt={user.name}
                                        fill
                                        unoptimized
                                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                                        sizes="44px"
                                    />
                                </div>

                                {/* User Info */}
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-white truncate max-w-[110px] sm:max-w-[130px] group-hover:text-amber-300 transition">
                                            {user.name}
                                        </span>
                                        {user.rank === 1 && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                                TOP 1
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-pink-300/60 truncate">
                                        {user.vipTier} • {user.transactionsCount} GD
                                    </span>
                                </div>
                            </div>

                            {/* Deposit Amount Pill */}
                            <div className="flex-shrink-0">
                                <span
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-tight border transition-all ${
                                        user.rank === 1
                                            ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                                            : 'bg-[#2b1026] text-pink-100 border-white/10'
                                    }`}
                                >
                                    {formatPrice(user.amount)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

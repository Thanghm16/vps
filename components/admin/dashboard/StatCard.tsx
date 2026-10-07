'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  iconColor?: string;
  gradient?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  isPositive = true,
  subtext,
  iconColor = 'text-rose-400',
  gradient = 'from-rose-500/20 to-pink-500/10',
}: StatCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-[#170616]/80 backdrop-blur-md border border-white/5 hover:border-rose-500/30 transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-bold text-pink-300/60 uppercase tracking-wider truncate">
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} border border-white/5 group-hover:scale-110 transition-transform`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>

      <div>
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {value}
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md text-[11px] ${
                isPositive
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {change}
            </span>
          )}

          {subtext && <span className="text-pink-200/50 truncate">{subtext}</span>}
        </div>
      </div>
    </div>
  );
}

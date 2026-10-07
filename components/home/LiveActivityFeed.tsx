'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { LiveActivity } from '@/app/api/activities/route';

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activities', { cache: 'no-store' });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(data.activities);
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu hoạt động trực tiếp:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActivities();
    // Tự động đồng bộ các giao dịch mới nhất từ MongoDB mỗi 30s
    const interval = setInterval(fetchActivities, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && activities.length === 0) {
    return (
      <div className="relative w-full py-2.5 px-3 sm:px-4 rounded-2xl bg-[#1b0a1a]/85 border border-rose-500/20 shadow-lg backdrop-blur-xl flex items-center overflow-hidden">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm mr-3 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
          <span>Live</span>
        </div>
        <div className="flex-1 text-xs text-pink-300/60 animate-pulse flex items-center gap-2">
          <span>Đang kết nối luồng giao dịch thời gian thực từ hệ thống...</span>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  // Nhân bản mảng để đảm bảo độ dài marquee luôn lấp đầy mọi kích thước màn hình và lặp vô tận mượt mà
  const repeatCount = activities.length < 6 ? 4 : (activities.length < 12 ? 3 : 2);
  const displayList = Array.from({ length: repeatCount }).flatMap(() => activities);

  // Tốc độ chạy chậm rãi, thư thả, dễ đọc (khoảng 6-8s cho mỗi item)
  const durationSeconds = Math.max(90, displayList.length * 4);

  return (
    <div className="relative w-full py-2.5 px-3 sm:px-4 rounded-2xl bg-[#1b0a1a]/85 border border-rose-500/20 shadow-lg backdrop-blur-xl flex items-center overflow-hidden group select-none">
      {/* FIXED LIVE BADGE ON LEFT */}
      <div className="relative z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm mr-3 sm:mr-4 shrink-0 bg-[#1b0a1a]">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
        <span>Live</span>
      </div>

      {/* GRADIENT FADE MASKS ON EDGES */}
      <div className="absolute left-[78px] sm:left-[92px] top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-[#1b0a1a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-[#1b0a1a] to-transparent z-10 pointer-events-none" />

      {/* CONTINUOUS MARQUEE TRACK (RIGHT TO LEFT) */}
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div 
          className="animate-marquee-infinite flex items-center gap-6 sm:gap-8 will-change-transform"
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          {displayList.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center gap-2 text-xs text-pink-100/90 whitespace-nowrap shrink-0 hover:text-white transition-colors"
            >
              <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-white/20 bg-rose-950">
                <Image
                  src={item.avatar || '/user-default.jpg'}
                  alt={item.user}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>

              <span className="font-bold text-white shrink-0">{item.user}</span>
              <span className="text-pink-200/85">{item.detail}</span>

              {item.price > 0 ? (
                <span className="font-bold text-rose-400 shrink-0 font-mono">
                  ({formatPrice(item.price)})
                </span>
              ) : null}

              <span className="text-[11px] text-pink-300/40 shrink-0 ml-1">
                {item.time}
              </span>

              <span className="text-[10px] text-emerald-400/80 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                Giao dịch tự động
              </span>

              <span className="text-rose-500/30 text-sm ml-4">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, CheckCircle2, MessageSquareQuote, PenLine } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ReviewItem {
  id: string;
  username: string;
  userAvatar?: string | null;
  rating: number;
  accountBought: string;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  displayDate?: string;
}

interface ReviewResponse {
  success: boolean;
  reviews: ReviewItem[];
  total: number;
  avgRating?: number;
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [avgRating, setAvgRating] = useState(5.0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchReviews() {
      try {
        setLoading(true);
        const res = await fetch('/api/reviews?limit=8', { cache: 'no-store' });
        const data: ReviewResponse = await res.json();
        if (isMounted && data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
          setTotalReviews(data.total || data.reviews.length);
          if (typeof data.avgRating === 'number') {
            setAvgRating(data.avgRating);
          } else if (data.reviews.length > 0) {
            const sum = data.reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
            setAvgRating(Number((sum / data.reviews.length).toFixed(1)));
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải đánh giá từ DB:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="w-full my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MessageSquareQuote className="w-6 h-6 text-rose-500" />
            <span>Khách Hàng Đánh Giá</span>
          </h2>
          <p className="text-xs text-pink-200/60 mt-0.5">
            Phản hồi thực tế từ những game thủ đã giao dịch thành công trên sàn
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalReviews > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#230d20] border border-white/5 text-xs font-bold text-amber-400">
              <span>★ {avgRating.toFixed(1)} / 5.0</span>
              <span className="text-pink-300/40">• {totalReviews} đánh giá</span>
            </div>
          )}

          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Gửi đánh giá</span>
          </Link>
        </div>
      </div>

      {/* Reviews Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[#190918]/60 border border-white/5 animate-pulse flex flex-col justify-between h-48"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-2/3" />
                    <div className="h-2 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-3 bg-white/10 rounded w-1/2 mb-3" />
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-white/5 rounded w-full" />
                  <div className="h-2.5 bg-white/5 rounded w-4/5" />
                </div>
              </div>
              <div className="pt-2.5 border-t border-white/5 flex justify-between">
                <div className="h-2.5 bg-white/5 rounded w-1/3" />
                <div className="h-2.5 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#190918]/70 border border-white/5 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Chưa có đánh giá nào từ khách hàng</h3>
          <p className="text-xs text-pink-200/50 max-w-sm mb-4">
            Hãy giao dịch và là người đầu tiên để lại phản hồi chất lượng về dịch vụ trên sàn nhé!
          </p>
          <Link
            href="/profile"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/30"
          >
            Đánh giá ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-[#190918]/70 hover:bg-[#230d20] border border-white/5 hover:border-rose-500/20 transition-all duration-300 shadow-xl flex flex-col justify-between group"
            >
              <div>
                {/* User row */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-rose-500/40 bg-[#250d24]">
                    {rev.userAvatar ? (
                      <Image
                        src={rev.userAvatar}
                        alt={rev.username}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-tr from-rose-600 to-purple-600 uppercase">
                        {rev.username.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {rev.username}
                      </span>
                      {rev.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-pink-300/50">
                      {formatRelativeTime(rev.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 text-amber-400 mb-2">
                  {[...Array(Math.min(5, Math.max(1, rev.rating || 5)))].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>

                {/* Comment */}
                <p className="text-xs text-pink-100/80 leading-relaxed italic line-clamp-3">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              {/* Bought badge */}
              <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-rose-400 font-bold truncate max-w-[170px]">
                  {rev.accountBought || 'Nick Game'}
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                  ✓ Đã mua
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

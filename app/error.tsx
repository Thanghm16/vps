'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Error]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c040b] text-white p-4 selection:bg-rose-600">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#1a0819]/90 border border-rose-500/30 shadow-2xl text-center space-y-5 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Đã Xảy Ra Lỗi Xử Lý
          </h2>
          <p className="text-xs text-pink-200/70 leading-relaxed">
            Hệ thống tạm thời không thể hoàn thành yêu cầu. Vui lòng thử tải lại trang hoặc quay về trang chủ.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-pink-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

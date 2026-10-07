import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Gamepad2, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white selection:bg-rose-600">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-rose-600/40 ring-2 ring-white/20">
          <Gamepad2 className="w-10 h-10 text-white animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="text-rose-400 font-mono text-xs uppercase tracking-widest font-bold">
            Lỗi 404 • Không Tìm Thấy Trang
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Tài Khoản Hoặc Trang Này Không Tồn Tại
          </h1>
          <p className="text-xs sm:text-sm text-pink-200/70 max-w-md mx-auto">
            Nick game bạn đang tìm có thể đã được giao dịch thành công, đổi mã số hoặc đường dẫn không chính xác.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl btn-gradient-hero text-white text-xs sm:text-sm font-bold shadow-xl shadow-rose-950/60 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Trang Chủ</span>
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-pink-200 hover:text-white text-xs sm:text-sm font-bold transition flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-rose-400" />
            <span>Tìm Nick Khác</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

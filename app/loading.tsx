import React from 'react';
import { Loader2, Gamepad2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c040b]/90 backdrop-blur-xl">
      <div className="relative flex flex-col items-center gap-4">
        {/* Animated Brand Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-rose-600/40 animate-pulse">
          <Gamepad2 className="w-9 h-9 text-white" />
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-500 opacity-30 blur-sm animate-ping" />
        </div>

        {/* Spinner & Message */}
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-pink-100 tracking-wide">Đang tải dữ liệu hệ thống...</span>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 rounded-full animate-marquee-infinite" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}

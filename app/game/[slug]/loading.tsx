import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GameLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white selection:bg-rose-600">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 flex-1">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 bg-white/5 rounded w-48 animate-pulse" />

        {/* Hero Skeleton */}
        <div className="rounded-3xl p-8 bg-[#180718]/80 border border-white/5 space-y-4 animate-pulse">
          <div className="h-6 bg-rose-500/20 rounded-full w-44" />
          <div className="h-10 bg-white/10 rounded-xl w-3/4 max-w-lg" />
          <div className="h-4 bg-white/5 rounded-lg w-full max-w-xl" />
          <div className="flex gap-3 pt-2">
            <div className="h-8 bg-white/5 rounded-xl w-32" />
            <div className="h-8 bg-white/5 rounded-xl w-32" />
            <div className="h-8 bg-white/5 rounded-xl w-32" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-white/10 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-4.5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl bg-[#180817]/80 border border-white/5 p-3 sm:p-3.5 space-y-3 animate-pulse"
              >
                <div className="w-full aspect-[16/10] rounded-xl bg-white/8 shrink-0" />
                <div className="space-y-2 py-0.5 flex-1">
                  <div className="h-3.5 bg-white/10 rounded-lg w-4/5" />
                  <div className="h-3 bg-white/5 rounded-lg w-3/5" />
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <div className="h-5 bg-purple-500/10 rounded-lg w-16" />
                    <div className="h-5 bg-white/5 rounded-lg w-14" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="h-4 bg-rose-500/20 rounded-lg w-20" />
                  <div className="h-7 bg-rose-600/20 rounded-xl w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Loader2, Search } from 'lucide-react';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#0c040b] text-[#fdf2f8] flex flex-col">
      {/* Header Placeholder */}
      <div className="h-16 w-full bg-[#120412] border-b border-white/5 animate-pulse" />

      {/* Hero Section Skeleton */}
      <div className="py-12 px-4 max-w-6xl mx-auto w-full flex flex-col items-center space-y-4">
        <div className="h-4 w-36 bg-white/10 rounded-full animate-pulse" />
        <div className="h-8 w-72 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-14 w-full max-w-2xl bg-white/5 rounded-2xl border border-rose-500/20 animate-pulse flex items-center px-4 gap-3">
          <Search className="w-5 h-5 text-rose-400/50" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="max-w-7xl w-full mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar Skeleton */}
        <div className="hidden lg:block w-72 h-96 rounded-3xl bg-[#180917]/80 border border-white/5 p-5 animate-pulse space-y-4">
          <div className="h-5 w-1/2 bg-white/10 rounded" />
          <div className="h-28 bg-white/5 rounded-xl" />
          <div className="h-28 bg-white/5 rounded-xl" />
        </div>

        {/* Account Cards Grid Skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-10 w-full rounded-2xl bg-white/5 animate-pulse flex items-center justify-between px-4">
            <div className="h-4 w-40 bg-white/10 rounded" />
            <div className="h-6 w-28 bg-white/10 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
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

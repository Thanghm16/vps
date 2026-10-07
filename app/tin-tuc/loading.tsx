import React from 'react';

export default function PublicNewsLoading() {
  return (
    <div className="min-h-screen bg-[#0c040b] text-[#fdf2f8] flex flex-col">
      {/* Header Bar */}
      <div className="h-16 w-full bg-[#120412] border-b border-white/5 animate-pulse" />

      {/* Hero Banner Skeleton */}
      <div className="py-12 px-4 max-w-5xl mx-auto w-full flex flex-col items-center space-y-4">
        <div className="h-4 w-36 bg-white/10 rounded-full animate-pulse" />
        <div className="h-10 w-80 bg-white/10 rounded-2xl animate-pulse" />
        <div className="h-4 w-96 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-12 w-full max-w-2xl bg-white/5 rounded-2xl border border-rose-500/20 animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-3xl bg-[#180817]/80 border border-white/5 p-4 space-y-3.5 animate-pulse"
            >
              <div className="w-full aspect-[16/10] rounded-2xl bg-white/8" />
              <div className="h-4 bg-white/10 rounded-lg w-4/5" />
              <div className="h-3 bg-white/5 rounded-lg w-3/5" />
              <div className="h-3 bg-white/5 rounded-lg w-1/2 pt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useSettings } from '@/components/settings/SettingsProvider';

export default function AnnouncementBar() {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  const announcement = settings.announcement;

  if (!announcement || !announcement.enabled || !announcement.text || dismissed) {
    return null;
  }

  const content = (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-pink-100 group pr-7 sm:pr-0">
      <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
      <span className="truncate max-w-[calc(100vw-85px)] sm:max-w-none">{announcement.text}</span>
      {announcement.link && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 underline underline-offset-2 group-hover:text-rose-200 transition-colors shrink-0">
          <span>Xem ngay</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      )}
    </div>
  );

  return (
    <div className="relative w-full py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-rose-950/90 via-purple-950/90 to-rose-950/90 border-b border-rose-500/20 backdrop-blur-md z-50 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-center relative">
        {announcement.link ? (
          <Link href={announcement.link} className="hover:opacity-95 transition-opacity max-w-full">
            {content}
          </Link>
        ) : (
          content
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 p-1 text-pink-300/60 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer"
          title="Đóng thông báo"
          aria-label="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Share2, Link as LinkIcon, Check, Send } from 'lucide-react';
import { App, Tooltip } from 'antd';

interface SocialShareBarProps {
  url: string;
  title: string;
}

export default function SocialShareBar({ url, title }: SocialShareBarProps) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        message.success('Đã sao chép liên kết bài viết!');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      message.error('Không thể sao chép liên kết.');
    }
  };

  const handleShareFacebook = () => {
    if (typeof window !== 'undefined') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        '_blank',
        'width=600,height=400'
      );
    }
  };

  const handleShareTwitter = () => {
    if (typeof window !== 'undefined') {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        '_blank',
        'width=600,height=400'
      );
    }
  };

  const handleShareTelegram = () => {
    if (typeof window !== 'undefined') {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        '_blank',
        'width=600,height=400'
      );
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-pink-300/60 font-semibold mr-1 flex items-center gap-1">
        <Share2 className="w-3.5 h-3.5" />
        <span>Chia sẻ:</span>
      </span>

      {/* Facebook */}
      <Tooltip title="Chia sẻ lên Facebook">
        <button
          type="button"
          onClick={handleShareFacebook}
          className="px-2.5 py-1 rounded-xl bg-[#1877f2]/20 hover:bg-[#1877f2] border border-[#1877f2]/30 text-blue-200 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
        >
          Facebook
        </button>
      </Tooltip>

      {/* Twitter / X */}
      <Tooltip title="Chia sẻ lên X (Twitter)">
        <button
          type="button"
          onClick={handleShareTwitter}
          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/20 border border-white/10 text-pink-200 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
        >
          X
        </button>
      </Tooltip>

      {/* Telegram */}
      <Tooltip title="Chia sẻ qua Telegram">
        <button
          type="button"
          onClick={handleShareTelegram}
          className="px-2.5 py-1 rounded-xl bg-[#229ed9]/20 hover:bg-[#229ed9] border border-[#229ed9]/30 text-cyan-200 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3 h-3" />
          <span>Telegram</span>
        </button>
      </Tooltip>

      {/* Copy Link */}
      <Tooltip title={copied ? 'Đã sao chép' : 'Sao chép link'}>
        <button
          type="button"
          onClick={handleCopyLink}
          className={`p-1.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
              : 'bg-white/5 hover:bg-white/10 text-pink-300 hover:text-white border-white/10'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
        </button>
      </Tooltip>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { sanitizeHtmlContent } from '@/lib/security/html-sanitizer';

interface SafeHtmlRendererProps {
  content: string;
  className?: string;
}

export default function SafeHtmlRenderer({ content, className = '' }: SafeHtmlRendererProps) {
  // Sanitize nội dung HTML an toàn trước khi render
  const cleanHtml = useMemo(() => {
    return sanitizeHtmlContent(content || '');
  }, [content]);

  if (!cleanHtml) {
    return (
      <div className="text-zinc-500 italic py-4">
        Nội dung bài viết đang được cập nhật...
      </div>
    );
  }

  return (
    <div
      className={`prose prose-invert max-w-none 
        text-pink-100/90 text-sm sm:text-base leading-relaxed sm:leading-8
        prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight
        prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
        prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-7 prose-h2:mb-3.5 prose-h2:text-rose-300 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
        prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-pink-200
        prose-p:mb-5 prose-p:text-pink-100/85
        prose-a:text-rose-400 hover:prose-a:text-rose-300 prose-a:underline prose-a:font-semibold prose-a:transition-colors
        prose-strong:text-white prose-strong:font-bold
        prose-blockquote:border-l-4 prose-blockquote:border-rose-500 prose-blockquote:bg-rose-950/20 prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-2xl prose-blockquote:text-pink-200/90 prose-blockquote:italic prose-blockquote:my-6
        prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-5 prose-ul:space-y-1.5
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-5 prose-ol:space-y-1.5
        prose-li:text-pink-100/85
        prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-img:shadow-2xl prose-img:my-6 prose-img:mx-auto prose-img:max-h-[520px] prose-img:object-cover
        prose-table:w-full prose-table:my-6 prose-table:border-collapse prose-table:border prose-table:border-white/10 prose-table:rounded-xl prose-table:overflow-hidden
        prose-th:bg-[#1a0818] prose-th:text-white prose-th:font-bold prose-th:p-3 prose-th:border prose-th:border-white/10 prose-th:text-left
        prose-td:p-3 prose-td:border prose-td:border-white/5 prose-td:text-pink-100/80
        prose-hr:border-white/10 prose-hr:my-8
        prose-pre:bg-[#130412] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl prose-pre:p-4 prose-pre:text-xs sm:prose-pre:text-sm prose-pre:overflow-x-auto
        prose-code:text-rose-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-xs
        ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

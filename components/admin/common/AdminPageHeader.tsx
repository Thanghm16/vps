'use client';

import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function AdminPageHeader({
  title,
  description,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-pink-200/60 mt-1">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

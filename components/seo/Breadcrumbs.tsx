import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import JsonLd from './JsonLd';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  siteUrl?: string;
  className?: string;
}

export default function Breadcrumbs({
  items,
  siteUrl = 'https://gamestore.vn',
  className = '',
}: BreadcrumbsProps) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');

  const breadcrumbListSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang Chủ',
        item: normalizedSiteUrl,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        ...(item.href ? { item: `${normalizedSiteUrl}${item.href}` } : {}),
      })),
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbListSchema} />

      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-xs text-pink-300/60 overflow-x-auto py-2.5 whitespace-nowrap scrollbar-none ${className}`}
      >
        <ol className="flex items-center gap-1.5 list-none p-0 m-0">
          <li className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-white transition-colors text-pink-200/70"
              title="Trang chủ"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang Chủ</span>
            </Link>
          </li>

          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-pink-400/40 shrink-0" />
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors text-pink-200/70"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-pink-100 truncate max-w-[200px] sm:max-w-none">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

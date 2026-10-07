'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_NAME_MAP: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  accounts: 'Quản lý Nick',
  games: 'Danh mục Game',
  orders: 'Đơn hàng',
  customers: 'Khách hàng',
  transactions: 'Giao dịch',
  banners: 'Banner Quảng Cáo',
  coupons: 'Mã Giảm Giá',
  settings: 'Cài đặt Hệ Thống',
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-pink-300/60" aria-label="Breadcrumb">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 hover:text-white transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Admin</span>
      </Link>

      {segments.map((segment, idx) => {
        if (segment === 'admin') return null;
        const href = `/${segments.slice(0, idx + 1).join('/')}`;
        const isLast = idx === segments.length - 1;
        const name = ROUTE_NAME_MAP[segment] || segment;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-3 h-3 text-pink-300/40" />
            {isLast ? (
              <span className="text-white font-semibold">{name}</span>
            ) : (
              <Link href={href} className="hover:text-white transition">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

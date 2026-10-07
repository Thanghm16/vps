'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Popover, Badge, Input } from 'antd';
import AdminBreadcrumb from './AdminBreadcrumb';
import { useAuth } from '@/components/auth/AuthProvider';

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
}

const PAGE_TITLE_MAP: Record<string, string> = {
  '/admin': 'Dashboard Tổng Quan',
  '/admin/dashboard': 'Dashboard Tổng Quan',
  '/admin/accounts': 'Quản Lý Kho Nick Game',
  '/admin/games': 'Danh Mục Trò Chơi',
  '/admin/orders': 'Quản Lý Đơn Hàng',
  '/admin/customers': 'Quản Lý Khách Hàng',
  '/admin/transactions': 'Lịch Sử Giao Dịch & Nạp Tiền',
  '/admin/banners': 'Quản Lý Banner Quảng Cáo',
  '/admin/coupons': 'Quản Lý Mã Giảm Giá (Voucher)',
  '/admin/settings': 'Cài Đặt Hệ Thống Sàn',
};

export default function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLE_MAP[pathname] || 'Admin Portal';
  const [searchVal, setSearchVal] = useState('');
  const { user } = useAuth();

  const notifications = [
    {
      id: 1,
      title: 'Đơn hàng mới #ORD-10291',
      desc: 'Khách hàng vừa thanh toán nick Liên Quân 1.850.000đ',
      time: '3 phút trước',
      type: 'order',
    },
    {
      id: 2,
      title: 'Giao dịch VietQR thành công',
      desc: 'Nguyễn Văn An nạp 2.000.000đ qua VietQR tự động',
      time: '15 phút trước',
      type: 'deposit',
    },
    {
      id: 3,
      title: 'Cảnh báo tồn kho',
      desc: 'Kho nick Valorant chỉ còn dưới 10 nick hạng Radiant',
      time: '1 giờ trước',
      type: 'alert',
    },
  ];

  const notificationContent = (
    <div className="w-80 max-w-[90vw] p-2">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Thông Báo Hệ Thống
        </span>
        <span className="text-[10px] text-rose-400 font-semibold cursor-pointer hover:underline">
          Đánh dấu đã đọc
        </span>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-start gap-2.5"
          >
            <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{n.title}</div>
              <div className="text-[11px] text-pink-200/60 leading-relaxed mt-0.5">
                {n.desc}
              </div>
              <div className="text-[10px] text-pink-300/40 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{n.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#0f040e]/85 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* LEFT: Mobile Toggle + Breadcrumb + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-pink-200 hover:text-white hover:bg-white/5 transition"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <AdminBreadcrumb />
          <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight mt-0.5">
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* RIGHT: Search + View Shop + Notifications + Admin Badge */}
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="hidden md:block w-48 lg:w-64">
          <Input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Tìm đơn, mã nick..."
            prefix={<Search className="w-3.5 h-3.5 text-pink-300/50 mr-1" />}
            className="rounded-full bg-white/5 border-white/10 text-xs text-white placeholder:text-pink-300/40 hover:border-rose-500/40 focus:border-rose-500"
          />
        </div>

        {/* View Public Store */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-rose-600/20 border border-white/10 hover:border-rose-500/30 text-xs font-semibold text-pink-200 hover:text-white transition"
          title="Mở giao diện khách hàng"
        >
          <span>Xem Store</span>
          <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
        </Link>

        {/* Notifications Popover */}
        <Popover
          content={notificationContent}
          trigger="click"
          placement="bottomRight"
          overlayInnerStyle={{
            backgroundColor: '#190a18',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
          }}
        >
          <button
            type="button"
            className="p-2 rounded-xl text-pink-200/80 hover:text-white hover:bg-white/5 transition relative"
            aria-label="Thông báo"
          >
            <Badge count={3} size="small" offset={[2, -2]} color="#e11d48">
              <Bell className="w-4 h-4 text-pink-200 hover:text-white transition" />
            </Badge>
          </button>
        </Popover>

        {/* Admin Avatar & Role Mini Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-rose-500/40 bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.username || 'Admin'}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <span className="text-white font-black text-xs">
                {(user?.username || 'A').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-bold text-white leading-tight">
              {user?.username || 'Administrator'}
            </span>
            <span className="text-[10px] text-pink-300/50 font-medium capitalize">
              {user?.role || 'Administrator'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

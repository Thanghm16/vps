'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Gamepad2,
  Home,
  LayoutDashboard,
  ShoppingBag,
  Users,
  WalletCards,
  TicketPercent,
  Image as ImageIcon,
  Settings,
  ShieldCheck,
  ChevronRight,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Newspaper,
  Gift,
} from 'lucide-react';
import { Dropdown, Tooltip, type MenuProps } from 'antd';
import { useAuth } from '@/components/auth/AuthProvider';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateMobile?: () => void;
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  onNavigateMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      name: 'Xem Trang Chủ',
      href: '/',
      icon: Home,
      external: true,
    },
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      name: 'Quản lý Nick',
      href: '/admin/accounts',
      icon: Gamepad2,
    },
    {
      name: 'Danh mục Game',
      href: '/admin/games',
      icon: ShieldCheck,
    },
    {
      name: 'Đơn hàng',
      href: '/admin/orders',
      icon: ShoppingBag,
    },
    {
      name: 'Khách hàng',
      href: '/admin/customers',
      icon: Users,
    },
    {
      name: 'Giao dịch',
      href: '/admin/transactions',
      icon: WalletCards,
    },
    {
      name: 'Mã giảm giá',
      href: '/admin/coupons',
      icon: TicketPercent,
    },
    {
      name: 'Vòng Quay',
      href: '/admin/lucky-wheel',
      icon: Gift,
      badge: 'Hot',
    },
    {
      name: 'Banner',
      href: '/admin/banners',
      icon: ImageIcon,
    },
    {
      name: 'Tin tức',
      href: '/admin/news',
      icon: Newspaper,
    },
    {
      name: 'Cài đặt',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <User className="w-4 h-4 text-pink-300" />,
      label: <span className="text-xs font-semibold text-white">Hồ sơ cá nhân</span>,
    },
    {
      key: 'settings',
      icon: <Settings className="w-4 h-4 text-pink-300" />,
      label: (
        <Link href="/admin/settings" className="text-xs font-semibold text-white">
          Cài đặt hệ thống
        </Link>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogOut className="w-4 h-4 text-rose-400" />,
      label: <span className="text-xs font-semibold text-rose-400">Đăng xuất</span>,
      onClick: () => logout(),
    },
  ];

  return (
    <aside
      className={`h-screen flex flex-col justify-between bg-[#110410] border-r border-white/8 transition-all duration-300 select-none z-30 sticky top-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* HEADER LOGO */}
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          onClick={onNavigateMobile}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-600/30 flex-shrink-0">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-white font-black text-base tracking-tight">Game</span>
                <span className="text-rose-500 font-black text-base tracking-tight">STORE</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ADMIN PANEL
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* Toggle Collapse Button on Desktop */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-pink-300/60 hover:text-white hover:bg-white/5 transition"
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* NAVIGATION ITEMS (ĐƯA VỀ 1 DANH SÁCH LIỀN MẠCH, GẦN NHAU) */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-none">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin/dashboard'
              ? pathname === '/admin' || pathname === '/admin/dashboard'
              : pathname === item.href;

          const isHome = item.href === '/';

          const content = (
            <Link
              key={idx}
              href={item.href}
              onClick={onNavigateMobile}
              target={item.external ? '_blank' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-rose-600/25 via-pink-600/15 to-transparent text-white font-bold border border-rose-500/30 shadow-md shadow-rose-950/40'
                  : isHome
                  ? 'text-pink-200/80 hover:text-white hover:bg-rose-500/10 border border-white/5 font-medium'
                  : 'text-pink-200/65 hover:text-white hover:bg-white/5 border border-transparent font-medium'
              }`}
            >
              {/* Active Indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              )}

              <Icon
                className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive
                    ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                    : isHome
                    ? 'text-pink-300/80 group-hover:text-rose-300'
                    : 'text-pink-300/60 group-hover:text-pink-100'
                }`}
              />

              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-xs truncate">{item.name}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                      {item.badge}
                    </span>
                  )}
                  {item.external && (
                    <ExternalLink className="w-3 h-3 text-pink-300/40 group-hover:text-pink-200" />
                  )}
                </div>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={idx} placement="right" title={item.name}>
                {content}
              </Tooltip>
            );
          }

          return content;
        })}
      </div>

      {/* FOOTER USER PROFILE DROPDOWN */}
      <div className="p-3 border-t border-white/8 bg-[#0e030d]">
        <Dropdown menu={{ items: userDropdownItems }} trigger={['click']} placement="topRight">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-1 ring-rose-500/40 bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.username || 'Admin'}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                <span className="text-white font-black text-sm">
                  {(user?.username || 'A').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {user?.username || 'Administrator'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-pink-300/60 font-medium capitalize">
                    {user?.role || 'admin'}
                  </span>
                </div>
              </div>
            )}

            {!collapsed && <ChevronRight className="w-4 h-4 text-pink-300/40 flex-shrink-0" />}
          </div>
        </Dropdown>
      </div>
    </aside>
  );
}

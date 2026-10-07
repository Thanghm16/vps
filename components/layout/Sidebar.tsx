'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Search,
  Grid2X2,
  Trophy,
  Gift,
  RotateCw,
  Newspaper,
  Heart,
  Headphones,
} from 'lucide-react';
import { Tooltip } from 'antd';

interface SidebarProps {
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
  savedCount?: number;
}

export default function Sidebar({
  activeTab = 'home',
  onTabSelect,
  savedCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { id: 'home', label: 'Trang Chủ', icon: Home, href: '/' },
    { id: 'browse', label: 'Kho Nick Game', icon: Grid2X2, href: '/search' },
    { id: 'lucky-wheel', label: 'Vòng Quay May Mắn', icon: Gift, href: '/vong-quay-may-man' },
    { id: 'news', label: 'Tin Tức & Cẩm Nang', icon: Newspaper, href: '/tin-tuc' },
    { id: 'rankings', label: 'Top Khách Hàng', icon: Trophy, href: '/#rankings' },
    { id: 'wishlist', label: 'Nick Yêu Thích', icon: Heart, href: '/profile?tab=favorites', badge: savedCount },
  ];

  return (
    <aside className="hidden lg:flex flex-col items-center gap-5 py-5 px-3.5 w-20 rounded-[32px] bg-[#1a0a18]/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 sticky top-[76px] z-30 shrink-0">
      {/* Top Icons */}
      <div className="flex flex-col items-center gap-5 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.href !== '/' && !item.href.startsWith('/#') && pathname?.startsWith(item.href)) ||
            (item.href === '/' && pathname === '/' && activeTab === 'home');

          return (
            <Tooltip key={item.id} title={item.label} placement="right">
              <button
                onClick={() => {
                  if (item.href.startsWith('/') && !item.href.startsWith('/#')) {
                    router.push(item.href);
                  } else if (onTabSelect) {
                    onTabSelect(item.id);
                  } else {
                    router.push(item.href);
                  }
                }}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-tr from-rose-600/90 to-pink-600/90 text-white shadow-lg shadow-rose-600/30 ring-1 ring-white/20'
                    : 'text-pink-200/60 hover:text-pink-100 hover:bg-white/5'
                }`}
                aria-label={item.label}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center border-2 border-[#1a0a18] shadow-md shadow-rose-950/60 leading-none">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            </Tooltip>
          );
        })}

        {/* Divider */}
        <div className="w-8 h-[1px] bg-white/10 my-1" />

        {/* Support Headphones */}
        <Tooltip title="Hỗ Trợ 24/7" placement="right">
          <button
            onClick={() => onTabSelect?.('support')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${
              activeTab === 'support'
                ? 'bg-gradient-to-tr from-rose-600/90 to-pink-600/90 text-white shadow-lg'
                : 'text-pink-200/60 hover:text-pink-100 hover:bg-white/5'
            }`}
            aria-label="Hỗ trợ kỹ thuật"
          >
            <Headphones className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}

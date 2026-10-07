'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Grid2X2, Trophy, Heart, Headphones, X, Zap, Gamepad2, Newspaper, Gift } from 'lucide-react';
import { Drawer } from 'antd';
import Image from 'next/image';
import { useSettings } from '@/components/settings/SettingsProvider';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabSelect: (tabId: string) => void;
  savedCount?: number;
}

export default function MobileNavigation({
  isOpen,
  onClose,
  activeTab,
  onTabSelect,
  savedCount = 0,
}: MobileNavProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const brandName = settings.brandName || 'Game STORE';
  const logoUrl = settings.logo?.url;

  const navItems = [
    { id: 'home', label: 'Trang Chủ', icon: Home, href: '/' },
    { id: 'browse', label: 'Kho Nick Game', icon: Grid2X2, href: '/search' },
    { id: 'lucky-wheel', label: 'Vòng Quay May Mắn', icon: Gift, href: '/vong-quay-may-man' },
    { id: 'news', label: 'Tin Tức & Cẩm Nang', icon: Newspaper, href: '/tin-tuc' },
    { id: 'rankings', label: 'Đua Top Mua Nick', icon: Trophy, href: '/#rankings' },
    { id: 'wishlist', label: 'Nick Đã Lưu', icon: Heart, href: '/profile?tab=favorites', badge: savedCount },
    { id: 'support', label: 'Hỗ Trợ Kỹ Thuật 24/7', icon: Headphones, href: '/#support' },
  ];

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        onClose={onClose}
        open={isOpen}
        size={280}
        closeIcon={<X className="w-5 h-5 text-pink-300" />}
        styles={{
          body: {
            background: '#140613',
            padding: '1.5rem',
            color: '#fdf2f8',
          },
          header: {
            background: '#190817',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          },
        }}
        title={
          logoUrl ? (
            <div className="relative h-8 w-32">
              <Image src={logoUrl} alt={brandName} fill className="object-contain object-left" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center shadow">
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-black text-base">{brandName}</span>
            </div>
          )
        }
      >
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    if (item.href.startsWith('/') && !item.href.startsWith('/#')) {
                      router.push(item.href);
                    } else if (onTabSelect) {
                      onTabSelect(item.id);
                    }
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-left font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-600/90 to-pink-600/90 text-white font-semibold'
                      : 'text-pink-100/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="px-2 py-0.5 text-xs bg-rose-500 text-white font-bold rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-[#230d20] border border-rose-500/20 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
              <Zap className="w-4 h-4" />
              <span>Giao Dịch Tự Động 24/7</span>
            </div>
            <p className="text-pink-200/60 text-[11px] leading-relaxed">
              Nhận tài khoản ngay sau khi thanh toán. Bảo mật 100%, bảo hành uy tín.
            </p>
          </div>
        </div>
      </Drawer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#160714]/95 backdrop-blur-lg border-t border-white/10 px-4 py-2 flex items-center justify-around">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.href.startsWith('/') && !item.href.startsWith('/#')) {
                  router.push(item.href);
                } else if (onTabSelect) {
                  onTabSelect(item.id);
                }
              }}
              className={`flex flex-col items-center gap-1 p-1.5 transition ${
                isActive ? 'text-rose-400 font-bold' : 'text-zinc-400 hover:text-pink-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] bg-rose-600 text-white rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

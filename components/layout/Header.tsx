'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Gamepad2,
  Menu,
  User,
  LogIn,
  LogOut,
  KeyRound,
  LayoutDashboard,
  Wallet,
  PlusCircle,
  Heart,
  X,
  Loader2,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { useSettings } from '@/components/settings/SettingsProvider';
import { GameAccount } from '@/types/account';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
import DepositModal from '@/components/payment/DepositModal';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
}

export default function Header({
  onOpenMobileMenu,
  cartCount: propsCartCount,
  onOpenCart: propsOpenCart,
  }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GameAccount[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);

  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { user, loading, isAuthenticated, isAdmin, logout } = useAuth();
  const cart = useCart();
  const { favoritesCount } = useFavorites();
  const { settings } = useSettings();

  const brandName = settings.brandName || 'Game STORE';
  const logoUrl = settings.logo?.url;

  const cartCount = propsCartCount !== undefined ? propsCartCount : cart.cartCount;
  const onOpenCart = propsOpenCart || cart.openCart;

  // Xử lý tìm kiếm nick trực tiếp với Debounce 250ms
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setTotalResults(0);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accounts?search=${encodeURIComponent(trimmed)}&limit=8`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          setSearchResults(data.accounts);
          setTotalResults(data.total || 0);
        } else {
          setSearchResults([]);
          setTotalResults(0);
        }
      } catch (err) {
        console.warn('Search accounts error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(target) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div className="p-2 border-b border-rose-950/40 min-w-[200px]">
          <div className="font-semibold text-white text-sm flex items-center gap-2">
            <span>{user?.username}</span>
            {user?.userCode && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-white/10 text-pink-200 border border-white/10">
                #{user.userCode}
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isAdmin
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {isAdmin ? 'ADMIN' : 'MEMBER'}
            </span>
          </div>
          <div className="text-xs text-rose-300/70 mt-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-rose-400" />
              <span>Ví: {(user?.balance || 0).toLocaleString('vi-VN')} ₫</span>
            </div>
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold ml-2 underline cursor-pointer"
            >
              Nạp
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'profile',
      icon: <User className="w-4 h-4 text-pink-400" />,
      label: (
        <Link href="/profile" className="text-xs text-white hover:text-pink-400 font-bold">
          Trang Cá Nhân & Kho Nick
        </Link>
      ),
    },
    {
      key: 'favorites',
      icon: <Heart className="w-4 h-4 text-rose-400" />,
      label: (
        <Link href="/profile?tab=favorites" className="text-xs text-white hover:text-rose-400 font-bold flex items-center justify-between">
          <span>Nick Yêu Thích</span>
          {favoritesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold ml-2">
              {favoritesCount}
            </span>
          )}
        </Link>
      ),
    },
    {
      key: 'deposit',
      icon: <Wallet className="w-4 h-4 text-emerald-400" />,
      label: <span className="text-xs text-white hover:text-emerald-400 font-bold">Nạp Tiền Vào Ví</span>,
      onClick: () => setDepositOpen(true),
    },
    ...(isAdmin
      ? [
          {
            key: 'admin-dashboard',
            icon: <LayoutDashboard className="w-4 h-4 text-rose-400" />,
            label: (
              <Link href="/admin" className="text-xs text-white hover:text-rose-400 font-medium">
                Trang Quản Trị
              </Link>
            ),
          },
        ]
      : []),
    {
      key: 'change-password',
      icon: <KeyRound className="w-4 h-4 text-rose-400" />,
      label: <span className="text-xs text-white hover:text-rose-400 font-medium">Đổi Mật Khẩu</span>,
      onClick: () => setChangePasswordOpen(true),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogOut className="w-4 h-4 text-red-400" />,
      label: <span className="text-xs text-red-400 font-medium">Đăng Xuất</span>,
      onClick: () => logout(),
    },
  ];

  const renderSearchResultsDropdown = (isMobile: boolean = false) => {
    if (!isDropdownOpen || (!searchQuery.trim() && !isSearching)) {
      return null;
    }

    return (
      <div
        className={`absolute top-full left-0 right-0 mt-2 rounded-2xl bg-[#150614]/95 backdrop-blur-2xl border border-rose-500/30 shadow-2xl shadow-black/95 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 ${
          isMobile ? 'max-h-[360px]' : 'max-h-[440px]'
        } flex flex-col`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-black/50 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {isSearching ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                <span>Đang tìm kiếm...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-100">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tìm thấy {totalResults} nick phù hợp</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(false)}
            className="text-[10px] text-pink-300/60 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            Đóng (ESC)
          </button>
        </div>

        {/* BODY / RESULTS LIST */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-rose-900/40">
          {searchResults.length === 0 && !isSearching ? (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-2">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white">Không tìm thấy nick nào</p>
              <p className="text-[11px] text-pink-300/60 mt-1">
                Không có tài khoản nào khớp với từ khóa &quot;{searchQuery}&quot;. Thử tìm &quot;Liên Quân&quot;, &quot;Valorant&quot;, &quot;#LQ&quot;...
              </p>
            </div>
          ) : (
            searchResults.map((acc) => {
              const cleanCode = acc.code.replace(/^#/, '');
              const targetUrl = `/account/${encodeURIComponent(cleanCode)}`;

              return (
                <Link
                  key={acc.id || acc.code}
                  href={targetUrl}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setMobileSearchOpen(false);
                  }}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-rose-950/60 hover:to-purple-950/60 border border-transparent hover:border-rose-500/30 transition group cursor-pointer text-left"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-black/60 border border-white/10 overflow-hidden shrink-0">
                      <Image
                        src={acc.thumbnail || '/placeholder-game.jpg'}
                        alt={acc.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="56px"
                      />
                    </div>

                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                          {acc.gameName}
                        </span>
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-pink-200 shrink-0">
                          {acc.code}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                        {acc.title}
                      </p>

                      <div className="flex items-center gap-1.5 text-[10px] text-pink-300/60 truncate">
                        {acc.rank ? <span>Rank: {acc.rank}</span> : null}
                        {acc.heroCount ? <span>• {acc.heroCount} Tướng</span> : null}
                        {acc.skinCount ? <span>• {acc.skinCount} Skin</span> : null}
                        {acc.highlights?.[0] ? <span>• {acc.highlights[0]}</span> : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Tag */}
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                      {(acc.price || 0).toLocaleString('vi-VN')} ₫
                    </span>
                    {acc.originalPrice && acc.originalPrice > acc.price && (
                      <span className="text-[10px] text-zinc-500 line-through">
                        {(acc.originalPrice).toLocaleString('vi-VN')} ₫
                      </span>
                    )}
                    <span className="mt-0.5 text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Bàn giao 24/7
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        {searchResults.length > 0 && (
          <div className="p-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs shrink-0">
            <span className="text-[10px] sm:text-[11px] text-pink-300/50">
              Hiển thị {searchResults.length} / {totalResults} kết quả
            </span>
            <Link
              href={searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search'}
              onClick={() => {
                setIsDropdownOpen(false);
                setMobileSearchOpen(false);
              }}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 group cursor-pointer"
            >
              <span>Xem tất cả kết quả & bộ lọc</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-[#0c040b]/90 backdrop-blur-xl border-b border-white/5 shadow-md transition-all">
      {/* MAIN HEADER ROW */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 py-2 sm:py-3 px-2.5 sm:px-5 lg:px-6 xl:px-8">
        {/* LEFT: Logo & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-[#240e21]/70 border border-white/10 text-white hover:bg-[#341430] transition shrink-0"
            aria-label="Mở menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2 group shrink-0">
            {logoUrl ? (
              <div className="relative h-7 w-24 xs:w-28 sm:h-9 sm:w-36 md:h-10 md:w-44 shrink-0">
                <Image
                  src={logoUrl}
                  alt={brandName}
                  fill
                  className="object-contain object-left group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 115px, 180px"
                  priority
                />
              </div>
            ) : (
              <>
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 leading-none">
                    <span className="text-white font-black text-sm sm:text-base md:text-lg tracking-tight truncate max-w-[110px] sm:max-w-none">
                      {brandName}
                    </span>
                  </div>
                  <span className="hidden xs:inline-block text-[9px] sm:text-[10px] text-pink-300/60 font-medium tracking-widest uppercase">
                    Marketplace Nick VIP
                  </span>
                </div>
              </>
            )}
          </Link>
        </div>

        {/* CENTER: Search Bar (Desktop only, hidden on mobile) */}
        <div
          ref={desktopSearchRef}
          className="hidden md:flex relative flex-1 max-w-xl lg:max-w-2xl xl:max-w-3xl mx-2 md:mx-4 lg:mx-6"
        >
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 pointer-events-none text-zinc-400">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-pink-300/60" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsDropdownOpen(false);
                  if (searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  } else {
                    router.push('/search');
                  }
                }
              }}
              placeholder="Tìm nick theo mã #LQ, Valorant, rank, tướng, skin..."
              className="w-full h-10 pl-11 pr-10 rounded-full bg-[#230d1f]/80 border border-white/10 focus:border-rose-500/60 focus:bg-[#2d1127] text-sm text-pink-50 placeholder:text-zinc-500 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3.5 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DESKTOP SEARCH RESULTS LIVE DROPDOWN */}
          {renderSearchResultsDropdown(false)}
        </div>

        {/* RIGHT: Action Icons & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen);
              if (!mobileSearchOpen && searchQuery.trim()) {
                setIsDropdownOpen(true);
              }
            }}
            className={`md:hidden p-2 rounded-full border transition hover:scale-105 active:scale-95 shrink-0 ${
              mobileSearchOpen
                ? 'bg-rose-600/30 border-rose-500/50 text-white'
                : 'bg-[#240e21]/70 border-white/10 text-pink-100 hover:text-white'
            }`}
            aria-label="Tìm kiếm"
            title="Tìm kiếm tài khoản"
          >
            {mobileSearchOpen ? <X className="w-4 h-4 text-rose-300" /> : <Search className="w-4 h-4 text-pink-200" />}
          </button>

          {/* Vòng Quay May Mắn Quick Button */}
          <Link
            href="/vong-quay-may-man"
            className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
            title="Tham gia Vòng Quay May Mắn"
          >
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
            <span className="text-white font-extrabold text-[11px] sm:text-xs tracking-wide whitespace-nowrap">
              Vòng Quay
            </span>
          </Link>

          {/* Nạp Tiền Quick Button */}
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 !text-white font-bold text-xs shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
            title="Nạp tiền vào ví tự động"
            style={{ color: '#ffffff' }}
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 !text-white shrink-0" />
            <span className="!text-white font-extrabold text-[11px] sm:text-xs tracking-wide whitespace-nowrap">
              Nạp Tiền
            </span>
          </button>

          {/* Wishlist / Favorites (Hidden on small mobile, visible on sm+) */}
          <Link
            href={isAuthenticated ? '/profile?tab=favorites' : '/login?redirect=/profile?tab=favorites'}
            className="hidden sm:flex relative p-2.5 rounded-full bg-[#240e21]/70 border border-white/10 text-pink-100 hover:text-white hover:bg-[#341430] transition hover:scale-105 active:scale-95 shrink-0"
            aria-label="Tài khoản yêu thích"
            title="Danh sách nick yêu thích"
          >
            <Heart className="w-4 h-4 text-rose-400" />
            {favoritesCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-[#0d040c]">
                {favoritesCount}
              </span>
            ) : null}
          </Link>

          {/* Shopping Cart with Badge */}
          <button
            onClick={onOpenCart}
            className="relative p-2 sm:p-2.5 rounded-full bg-[#240e21]/70 border border-white/10 text-pink-100 hover:text-white hover:bg-[#341430] transition hover:scale-105 active:scale-95 shrink-0"
            aria-label="Giỏ hàng tài khoản"
          >
            <ShoppingCart className="w-4 h-4 text-pink-200" />
            {cartCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-[#0d040c]">
                {cartCount}
              </span>
            ) : null}
          </button>

          {/* AUTH STATE: Loading / Not Logged In / Logged In */}
          {loading ? (
            <div className="flex items-center gap-2 p-1 sm:pl-2 sm:py-1.5 sm:pr-4 rounded-full bg-[#240e21]/40 border border-white/5 animate-pulse shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-900/30" />
              <div className="hidden md:block w-16 h-3 bg-rose-900/30 rounded" />
            </div>
          ) : isAuthenticated && user ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
              overlayClassName="auth-dropdown-custom"
            >
              <button
                className="flex items-center gap-2 p-0.5 sm:pl-2 sm:py-1 sm:pr-3 rounded-full bg-[#240e21]/70 border border-white/10 hover:border-rose-500/40 hover:bg-[#341430] transition cursor-pointer text-left group shrink-0"
                aria-label="Menu tài khoản"
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-rose-500/50 bg-rose-950 flex items-center justify-center shrink-0">
                  {user.avatar && user.avatar !== '/user-default.jpg' ? (
                    <Image
                      src={user.avatar}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-pink-50 leading-tight group-hover:text-rose-300 transition-colors truncate max-w-[100px]">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-pink-300/70 leading-tight">
                    Ví: {(user.balance || 0).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </button>
            </Dropdown>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-500 hover:to-pink-600 !text-white font-bold text-xs transition shadow-md shadow-rose-900/40 hover:scale-105 active:scale-95 shrink-0"
              style={{ color: '#ffffff' }}
            >
              <LogIn className="w-3.5 h-3.5 !text-white stroke-[2.5]" style={{ color: '#ffffff' }} />
              <span className="hidden xs:inline !text-white font-bold tracking-wide" style={{ color: '#ffffff' }}>
                Đăng Nhập
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* MOBILE EXPANDABLE SEARCH BAR */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden relative w-full px-3 py-2 bg-[#160615]/95 border-t border-rose-500/20 backdrop-blur-xl animate-in slide-in-from-top-1 duration-200"
        >
          <div className="relative flex items-center w-full">
            <div className="absolute left-3.5 pointer-events-none text-pink-300/60">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsDropdownOpen(false);
                  setMobileSearchOpen(false);
                  if (searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  } else {
                    router.push('/search');
                  }
                }
              }}
              placeholder="Tìm kiếm nick, #LQ, Valorant, rank..."
              className="w-full h-9 pl-10 pr-9 rounded-full bg-[#230d1f] border border-rose-500/30 focus:border-rose-400 text-xs text-pink-50 placeholder:text-zinc-500 outline-none shadow-inner"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 p-1 text-zinc-400 hover:text-white cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* MOBILE SEARCH RESULTS LIVE DROPDOWN */}
          {renderSearchResultsDropdown(true)}
        </div>
      )}

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
      />
    </header>
  );
}

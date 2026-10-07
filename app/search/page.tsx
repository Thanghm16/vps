'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AccountCard from '@/components/account/AccountCard';
import { GameAccount } from '@/types/account';
import { useDebounce } from '@/hooks/useDebounce';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PackageOpen,
  ArrowUpDown,
  RotateCcw,
  Check,
  ShieldCheck,
  Zap,
  Gamepad2,
  Tag as TagIcon,
  Layers,
  Coins,
  Loader2,
} from 'lucide-react';
import { Drawer, Radio, Slider, App, Tooltip } from 'antd';

interface GameCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  count?: number;
}

const PRICE_PRESETS = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 100.000₫', min: 0, max: 100000 },
  { label: '100K - 500.000₫', min: 100000, max: 500000 },
  { label: '500K - 2.000.000₫', min: 500000, max: 2000000 },
  { label: '2Tr - 5.000.000₫', min: 2000000, max: 5000000 },
  { label: 'Trên 5.000.000₫', min: 5000000, max: undefined },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-low', label: 'Giá thấp → cao' },
  { value: 'price-high', label: 'Giá cao → thấp' },
  { value: 'views', label: 'Xem nhiều nhất' },
  { value: 'discount', label: 'Giảm giá sâu' },
];

const RANK_OPTIONS = [
  'Tất cả',
  'Đồng',
  'Bạc',
  'Vàng',
  'Bạch Kim',
  'Kim Cương',
  'Tinh Anh',
  'Cao Thủ',
  'Thách Đấu',
  'Radiant',
  'Immortal',
  'Ascendant',
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { message } = App.useApp();
  const { favoriteCodes, toggleFavorite } = useFavorites();

  // Initial params
  const initialQ = searchParams.get('q') || searchParams.get('search') || '';
  const initialGame = searchParams.get('game') || 'all';
  const initialSort = searchParams.get('sort') || searchParams.get('sortBy') || 'newest';
  const initialMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const initialMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const initialRank = searchParams.get('rank') || 'all';
  const initialStatus = searchParams.get('status') || 'available';

  // Search State
  const [searchInput, setSearchInput] = useState(initialQ);
  // CẤU HÌNH useDebounce 2000ms (2 giây) theo yêu cầu của user
  const debouncedSearchQuery = useDebounce(searchInput, 2000);

  // Filter States
  const [selectedGame, setSelectedGame] = useState<string>(initialGame);
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [minPrice, setMinPrice] = useState<number | undefined>(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initialMaxPrice);
  const [selectedRank, setSelectedRank] = useState<string>(initialRank);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);

  // Debounce cho minPrice / maxPrice custom input (2s)
  const debouncedMinPrice = useDebounce(minPrice, 2000);
  const debouncedMaxPrice = useDebounce(maxPrice, 2000);

  // Categories metadata
  const [categories, setCategories] = useState<GameCategoryItem[]>([
    { id: 'all', name: 'Tất cả game', slug: 'all' },
  ]);

  // Data & Loading States
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Kiểm tra xem có đang trong quá trình chờ debounce (2s) không
  const isTypingWaitingDebounce = searchInput !== debouncedSearchQuery;

  // 1. Tải danh mục game khi khởi tạo
  useEffect(() => {
    let isMounted = true;
    async function loadGames() {
      try {
        const res = await fetch('/api/games');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.games)) {
          setCategories([
            { id: 'all', name: 'Tất cả game', slug: 'all' },
            ...data.games.map((g: { slug: string; name: string; icon?: string }) => ({
              id: g.slug,
              name: g.name,
              slug: g.slug,
              icon: g.icon,
            })),
          ]);
        }
      } catch (err) {
        console.error('Lỗi tải danh mục game:', err);
      }
    }
    loadGames();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch danh sách tài khoản theo bộ lọc và debounced query
  const fetchFilteredAccounts = useCallback(
    async (
      pageNum: number,
      searchVal: string,
      gameVal: string,
      sortVal: string,
      minP?: number,
      maxP?: number,
      rankVal?: string,
      statusVal?: string
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', pageNum.toString());
        params.set('limit', '20');
        if (searchVal.trim()) params.set('search', searchVal.trim());
        if (gameVal && gameVal !== 'all') params.set('game', gameVal);
        if (sortVal) params.set('sortBy', sortVal);
        if (minP !== undefined && minP > 0) params.set('minPrice', minP.toString());
        if (maxP !== undefined && maxP > 0) params.set('maxPrice', maxP.toString());
        if (rankVal && rankVal !== 'all') params.set('rank', rankVal);
        if (statusVal) params.set('status', statusVal);

        const res = await fetch(`/api/accounts?${params.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          setTotalAccounts(data.total || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          setAccounts([]);
          setTotalAccounts(0);
          setTotalPages(1);
        }
      } catch (err) {
        console.error('Lỗi gọi API tìm kiếm nick:', err);
        message.error('Không thể tải dữ liệu tìm kiếm, vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  // Trigger tìm kiếm khi debounced query hoặc bất kỳ filter nào thay đổi
  useEffect(() => {
    fetchFilteredAccounts(
      page,
      debouncedSearchQuery,
      selectedGame,
      selectedSort,
      debouncedMinPrice,
      debouncedMaxPrice,
      selectedRank,
      selectedStatus
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedGame,
    selectedSort,
    debouncedMinPrice,
    debouncedMaxPrice,
    selectedRank,
    selectedStatus,
    fetchFilteredAccounts,
  ]);

  // Reset về page 1 khi thay đổi tiêu chí lọc
  const handleFilterChange = (updater: () => void) => {
    setPage(1);
    updater();
  };

  // Nút tìm kiếm ngay (bỏ qua chờ 2s debounce)
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchFilteredAccounts(
      1,
      searchInput,
      selectedGame,
      selectedSort,
      minPrice,
      maxPrice,
      selectedRank,
      selectedStatus
    );
  };

  // Xóa toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedGame('all');
    setSelectedSort('newest');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setSelectedRank('all');
    setSelectedStatus('available');
    setPage(1);
  };

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount =
    (searchInput ? 1 : 0) +
    (selectedGame !== 'all' ? 1 : 0) +
    (minPrice !== undefined || maxPrice !== undefined ? 1 : 0) +
    (selectedRank !== 'all' ? 1 : 0) +
    (selectedStatus !== 'available' ? 1 : 0) +
    (selectedSort !== 'newest' ? 1 : 0);

  // Pagination pages generator
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#0c040b] text-[#fdf2f8] flex flex-col selection:bg-rose-500 selection:text-white">
      {/* HEADER CHÍNH */}
      <Header />

      {/* TOP SEARCH BAR & HERO SECTION */}
      <section className="relative w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-gradient-to-b from-[#1b071a]/90 via-[#140614]/70 to-[#0c040b] overflow-hidden">
        {/* Glow Ambient Lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-pink-300/60 mb-3">
            <Link href="/" className="hover:text-rose-400 transition">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Tìm kiếm & Lọc nick game</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Bộ Lọc & Tìm Kiếm <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400">Kho Nick VIP</span>
          </h1>
          <p className="text-xs sm:text-sm text-pink-200/70 max-w-xl mt-2">
            Tìm nhanh theo mã nick, tên game, rank, số tướng, skin hoặc mức giá phù hợp.
          </p>

          {/* MAIN SEARCH INPUT FORM */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-3xl mt-6 relative flex items-center group"
          >
            <div className="relative w-full flex items-center rounded-2xl bg-[#1d0a1c]/90 border-2 border-rose-500/30 focus-within:border-rose-500 shadow-xl shadow-black/60 transition-all p-1 sm:p-1.5 backdrop-blur-xl">
              <div className="pl-3 sm:pl-4 pr-2 text-rose-400">
                {isTypingWaitingDebounce || loading ? (
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-rose-400" />
                ) : (
                  <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>

              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                }}
                placeholder="Nhập mã nick (#LQ10291, #VAL-8821), tên game, tướng, rank, skin..."
                className="flex-1 bg-transparent text-white text-sm sm:text-base outline-none placeholder:text-pink-300/40 px-2 py-2"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="p-1.5 rounded-full hover:bg-white/10 text-pink-300/50 hover:text-white mr-1.5 transition cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                className="px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl btn-gradient-hero text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                Tìm Kiếm
              </button>
            </div>
          </form>

          {/* DEBOUNCE FEEDBACK NOTICE */}
          <div className="h-6 mt-2 flex items-center justify-center text-[11px] text-pink-300/60 font-medium">
            {isTypingWaitingDebounce ? (
              <span className="flex items-center gap-1.5 text-amber-300 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang chờ bạn nhập xong (tự động gọi API sau 2s)...
              </span>
            ) : debouncedSearchQuery ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Đã áp dụng từ khóa: &quot;{debouncedSearchQuery}&quot;
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA WITH SIDEBAR FILTERS & RESULTS */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* DESKTOP FILTER SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 rounded-3xl bg-[#180917]/80 border border-white/10 p-5 shadow-xl backdrop-blur-xl sticky top-24 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <SlidersHorizontal className="w-4 h-4 text-rose-400" />
              <span>Bộ Lọc Tìm Kiếm</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* 1. TỰA GAME FILTER */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-pink-200/90 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Tựa Game</span>
            </label>
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-rose-900/40">
              {categories.map((cat) => {
                const isSelected = selectedGame === cat.slug;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleFilterChange(() => setSelectedGame(cat.slug))}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-rose-600/90 to-pink-600/90 text-white shadow-md shadow-rose-950/50'
                        : 'text-pink-100/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. MỨC GIÁ PRESETS & CUSTOM */}
          <div className="space-y-2.5 pt-3 border-t border-white/5">
            <label className="text-xs font-bold text-pink-200/90 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              <span>Khoảng Giá</span>
            </label>
            <div className="flex flex-col gap-1">
              {PRICE_PRESETS.map((preset, idx) => {
                const isSelected = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      handleFilterChange(() => {
                        setMinPrice(preset.min);
                        setMaxPrice(preset.max);
                      })
                    }
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold'
                        : 'text-pink-100/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-rose-400" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Min / Max inputs */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <span className="text-[10px] text-pink-300/60 block mb-1">Từ (VNĐ)</span>
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice ?? ''}
                  onChange={(e) =>
                    handleFilterChange(() =>
                      setMinPrice(e.target.value ? Number(e.target.value) : undefined)
                    )
                  }
                  className="w-full bg-[#100310] border border-white/10 focus:border-rose-500 rounded-lg text-xs text-white p-1.5 outline-none font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-pink-300/60 block mb-1">Đến (VNĐ)</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice ?? ''}
                  onChange={(e) =>
                    handleFilterChange(() =>
                      setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                    )
                  }
                  className="w-full bg-[#100310] border border-white/10 focus:border-rose-500 rounded-lg text-xs text-white p-1.5 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. RANK XẾP HẠNG */}
          <div className="space-y-2.5 pt-3 border-t border-white/5">
            <label className="text-xs font-bold text-pink-200/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Xếp Hạng (Rank)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RANK_OPTIONS.map((r) => {
                const isSelected = selectedRank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleFilterChange(() => setSelectedRank(r))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white/5 text-pink-200/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. TRẠNG THÁI NICK */}
          <div className="space-y-2.5 pt-3 border-t border-white/5">
            <label className="text-xs font-bold text-pink-200/90 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Trạng Thái</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleFilterChange(() => setSelectedStatus('available'))}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center cursor-pointer transition ${
                  selectedStatus === 'available'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-white/5 text-pink-200/60 hover:text-white'
                }`}
              >
                Sẵn sàng bán
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange(() => setSelectedStatus('all'))}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center cursor-pointer transition ${
                  selectedStatus === 'all'
                    ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                    : 'bg-white/5 text-pink-200/60 hover:text-white'
                }`}
              >
                Tất cả nick
              </button>
            </div>
          </div>
        </aside>

        {/* RESULTS MAIN COLUMN */}
        <main className="flex-1 w-full min-w-0 space-y-4">
          {/* TOOLBAR: RESULT COUNT, MOBILE FILTER TOGGLE & SORT */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#180917]/70 border border-white/5 backdrop-blur-xl">
            {/* Left: Total counter + Mobile filter button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Bộ lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </button>

              <div className="text-xs sm:text-sm text-pink-100/90 font-medium">
                {loading ? (
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải dữ liệu từ kho nick...
                  </span>
                ) : (
                  <span>
                    Tìm thấy <strong className="text-white text-sm sm:text-base font-bold">{totalAccounts.toLocaleString('vi-VN')}</strong> tài khoản phù hợp
                  </span>
                )}
              </div>
            </div>

            {/* Right: Sort By Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-pink-300/60 hidden sm:inline">Sắp xếp:</span>
              <select
                value={selectedSort}
                onChange={(e) => handleFilterChange(() => setSelectedSort(e.target.value))}
                className="bg-[#240c21] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1b061a] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ACTIVE FILTER TAGS PILLS */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-pink-300/50">Đang lọc:</span>

              {debouncedSearchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                  Từ khóa: &quot;{debouncedSearchQuery}&quot;
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedGame !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
                  Game: {categories.find((c) => c.slug === selectedGame)?.name || selectedGame}
                  <button
                    type="button"
                    onClick={() => setSelectedGame('all')}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(minPrice !== undefined || maxPrice !== undefined) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                  Giá: {minPrice ? minPrice.toLocaleString('vi-VN') : '0'}₫ -{' '}
                  {maxPrice ? maxPrice.toLocaleString('vi-VN') + '₫' : '∞'}
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                    }}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedRank !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                  Rank: {selectedRank}
                  <button
                    type="button"
                    onClick={() => setSelectedRank('all')}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline ml-1 cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {/* LOADING SKELETON STATE */}
          {loading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
              {[...Array(8)].map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col rounded-2xl bg-[#180817]/80 border border-white/5 p-3 sm:p-3.5 space-y-3 animate-pulse"
                >
                  <div className="w-full aspect-[16/10] rounded-xl bg-white/8 shrink-0" />
                  <div className="space-y-2 py-0.5 flex-1">
                    <div className="h-3.5 bg-white/10 rounded-lg w-4/5" />
                    <div className="h-3 bg-white/5 rounded-lg w-3/5" />
                    <div className="flex items-center gap-1.5 pt-1.5">
                      <div className="h-5 bg-purple-500/10 rounded-lg w-16" />
                      <div className="h-5 bg-white/5 rounded-lg w-14" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="h-4 bg-rose-500/20 rounded-lg w-20" />
                    <div className="h-7 bg-rose-600/20 rounded-xl w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            /* EMPTY STATE */
            <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-[#180917]/50 border border-white/5 my-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#280e25] flex items-center justify-center text-pink-300/40">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Không tìm thấy nick nào phù hợp
              </h3>
              <p className="text-xs text-pink-200/60 max-w-md">
                Không có tài khoản nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Thử xóa bớt bộ lọc hoặc tìm với từ khóa chung hơn.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-md cursor-pointer mt-2"
              >
                Đặt lại toàn bộ bộ lọc
              </button>
            </div>
          ) : (
            /* ACCOUNTS RESULTS GRID */
            <div className="space-y-6">
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
                {accounts.map((acc) => (
                  <AccountCard
                    key={acc.id || acc.code}
                    account={acc}
                    isFavorite={favoriteCodes.includes(acc.code)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#180917]/80 border border-white/5 shadow-lg mt-6">
                  <div className="text-xs text-pink-200/60 font-medium">
                    Hiển thị <strong>{accounts.length}</strong> / <strong>{totalAccounts.toLocaleString('vi-VN')}</strong> nick • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {/* First Page */}
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => {
                        setPage(1);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 cursor-pointer"
                      title="Trang đầu"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Prev Page */}
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => {
                        setPage(page - 1);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-xs font-semibold text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Trước</span>
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((pNum, idx) => {
                      if (pNum === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-xs text-pink-300/40">
                            ...
                          </span>
                        );
                      }

                      const isCurrent = pNum === page;
                      return (
                        <button
                          key={`page-${pNum}`}
                          type="button"
                          onClick={() => {
                            setPage(Number(pNum));
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            isCurrent
                              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30'
                              : 'bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white border border-white/5'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    {/* Next Page */}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => {
                        setPage(page + 1);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-xs font-semibold text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => {
                        setPage(totalPages);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 cursor-pointer"
                      title="Trang cuối"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MOBILE FILTER DRAWER */}
      <Drawer
        title={
          <div className="flex items-center justify-between text-white font-bold text-sm">
            <span>Bộ Lọc Tìm Kiếm Nick</span>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-400 hover:text-rose-300 font-normal underline"
              >
                Đặt lại
              </button>
            )}
          </div>
        }
        placement="bottom"
        onClose={() => setMobileFilterOpen(false)}
        open={mobileFilterOpen}
        height="85%"
        className="!bg-[#180918] !text-white"
        styles={{
          header: { background: '#120412', borderBottom: '1px solid rgba(255,255,255,0.08)' },
          body: { background: '#180918', padding: '16px' },
        }}
      >
        <div className="space-y-5 pb-16">
          {/* Tựa Game */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-pink-200">Tựa Game</span>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    handleFilterChange(() => setSelectedGame(cat.slug));
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-center truncate ${
                    selectedGame === cat.slug
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-white/5 text-pink-200/70'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mức Giá */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <span className="text-xs font-bold text-pink-200">Khoảng Giá</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRICE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleFilterChange(() => {
                      setMinPrice(p.min);
                      setMaxPrice(p.max);
                    });
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] text-center truncate ${
                    minPrice === p.min && maxPrice === p.max
                      ? 'bg-rose-500/30 border border-rose-500 text-rose-300 font-bold'
                      : 'bg-white/5 text-pink-200/70'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rank */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <span className="text-xs font-bold text-pink-200">Xếp Hạng (Rank)</span>
            <div className="flex flex-wrap gap-1.5">
              {RANK_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleFilterChange(() => setSelectedRank(r))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    selectedRank === r
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-pink-200/70'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Trạng thái */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <span className="text-xs font-bold text-pink-200">Trạng Thái</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFilterChange(() => setSelectedStatus('available'))}
                className={`py-2 rounded-xl text-xs font-semibold ${
                  selectedStatus === 'available'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-pink-200/70'
                }`}
              >
                Sẵn sàng bán
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange(() => setSelectedStatus('all'))}
                className={`py-2 rounded-xl text-xs font-semibold ${
                  selectedStatus === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-pink-200/70'
                }`}
              >
                Tất cả nick
              </button>
            </div>
          </div>

          {/* Button Xem Kết Quả */}
          <div className="fixed bottom-4 left-4 right-4 z-50">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full py-3 rounded-2xl btn-gradient-hero text-white font-bold text-sm shadow-xl shadow-rose-950/80 cursor-pointer"
            >
              Áp Dụng Bộ Lọc ({totalAccounts} Nick)
            </button>
          </div>
        </div>
      </Drawer>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c040b] flex flex-col items-center justify-center text-rose-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-bold text-pink-200">Đang khởi tạo trang tìm kiếm...</span>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

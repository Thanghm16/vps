'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import HeroBanner from '@/components/home/HeroBanner';
import TopDeposits from '@/components/home/TopDeposits';
import CategoryFilter from '@/components/home/CategoryFilter';
import AccountGrid from '@/components/home/AccountGrid';
import LiveActivityFeed from '@/components/home/LiveActivityFeed';
import MarketplaceStats from '@/components/home/MarketplaceStats';
import HowItWorks from '@/components/home/HowItWorks';
import CustomerReviews from '@/components/home/CustomerReviews';
import FaqSection from '@/components/home/FaqSection';
import TrustSection from '@/components/home/TrustSection';
import Footer from '@/components/layout/Footer';
import MaintenanceView from '@/components/layout/MaintenanceView';

import { GameAccount, GameCategory, HeroAccountSlide, TopDepositor } from '@/types/account';
import { BannerClientData } from '@/types/db-banner';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { useSettings } from '@/components/settings/SettingsProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { App } from 'antd';
import { HomeInitialData } from '@/lib/db/home';

// Lazy load Modals & Drawers on-demand (tách khỏi initial client bundle)
const QuickBuyModal = dynamic(() => import('@/components/account/QuickBuyModal'), {
  ssr: false,
});
const DepositModal = dynamic(() => import('@/components/payment/DepositModal'), {
  ssr: false,
});
const SupportModal = dynamic(() => import('@/components/common/SupportModal'), {
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/common/CartDrawer'), {
  ssr: false,
});

interface HomeClientViewProps {
  initialData: HomeInitialData;
}

export default function HomeClientView({ initialData }: HomeClientViewProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const { settings } = useSettings();
  const { isAdmin, loading: authLoading } = useAuth();
  const { favoriteCodes, toggleFavorite, favoritesCount } = useFavorites();

  // Khởi tạo state trực tiếp từ SSR initialData (Zero initial loading)
  const [accounts, setAccounts] = useState<GameAccount[]>(initialData.initialAccounts);
  const [featuredAccounts] = useState<GameAccount[]>(initialData.featuredAccounts);
  const [customBanners] = useState<BannerClientData[]>(initialData.customBanners);
  const [categories] = useState<{ id: string; name: string }[]>(initialData.categories);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topDepositors, setTopDepositors] = useState<TopDepositor[]>(initialData.topDepositors);
  const [topLoading, setTopLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(initialData.totalAccounts);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  // Modals state
  const [selectedAccountForBuy, setSelectedAccountForBuy] = useState<GameAccount | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cảnh báo khi người dùng không có quyền admin bị đẩy về trang chủ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized_admin') {
        message.error('Tài khoản của bạn không có quyền truy cập trang quản trị!');
        window.history.replaceState({}, '', '/');
      }
    }
  }, [message]);

  // Tải danh sách Top Nạp Tiền khi mở / đóng modal nạp
  const loadTopDepositors = useCallback(async () => {
    try {
      setTopLoading(true);
      const res = await fetch('/api/top-deposits?period=month&limit=5');
      const data = await res.json();
      if (data.success && Array.isArray(data.depositors)) {
        setTopDepositors(data.depositors);
      }
    } catch (e) {
      console.warn('Could not load top depositors:', e);
    } finally {
      setTopLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!depositOpen) {
      loadTopDepositors();
    }
  }, [depositOpen, loadTopDepositors]);

  // Tải danh sách tài khoản theo bộ lọc / trang mới (chỉ gọi khi user tương tác)
  const fetchStorefrontAccounts = useCallback(
    async (
      targetCat: string = selectedCategory,
      targetPage: number = 1,
      targetSearch: string = searchQuery
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', String(pageSize));
        if (targetCat !== 'all') params.set('game', targetCat);
        if (targetSearch.trim()) params.set('search', targetSearch.trim());

        const res = await fetch(`/api/accounts?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          setTotalCount(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setPage(data.page || targetPage);
        }
      } catch (e) {
        console.warn('Could not sync with MongoDB live data:', e);
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, searchQuery, pageSize]
  );

  // Khi click chọn danh mục game
  const handleSelectCategory = (cat: GameCategory) => {
    setSelectedCategory(cat);
    setPage(1);
    fetchStorefrontAccounts(cat, 1, searchQuery);
  };

  // Khi gõ tìm kiếm: Debounce 350ms
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      fetchStorefrontAccounts(selectedCategory, 1, val);
    }, 350);
  };

  // Khi chuyển trang
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchStorefrontAccounts(selectedCategory, newPage, searchQuery);
    if (typeof window !== 'undefined') {
      const gridElem = document.getElementById('kho-nick');
      if (gridElem) {
        gridElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Dynamic Hero Slides
  const heroSlides: HeroAccountSlide[] = useMemo(() => {
    const source = featuredAccounts.length > 0 ? featuredAccounts : accounts.slice(0, 4);

    return source.map((acc, idx) => {
      const discount =
        acc.originalPrice > acc.price
          ? `Giảm ${Math.round(((acc.originalPrice - acc.price) / acc.originalPrice) * 100)}%`
          : 'Giá cực tốt';

      return {
        id: acc.id || acc.code,
        title: acc.title,
        subtitle: `Tài khoản ${acc.gameName} VIP • Sẵn sàng giao dịch`,
        description: acc.description || `Mã nick ${acc.code}, bàn giao tự động bảo mật 100%.`,
        price: acc.price,
        originalPrice: acc.originalPrice || acc.price,
        discountBadge: discount,
        bannerImage: acc.images?.[0] || acc.thumbnail || '/1768727344439.jpg',
        gameName: acc.gameName,
        accountCode: acc.code,
        accountSlug: acc.slug || acc.code,
        slideNumber: `0${idx + 1} / 0${source.length}`,
        tags: acc.tags && acc.tags.length > 0 ? acc.tags : [acc.gameName, 'Bàn giao tự động'],
      };
    });
  }, [featuredAccounts, accounts]);

  // Cart items
  const cartItems = useMemo(() => {
    return accounts.filter((acc) => favoriteCodes.includes(acc.code));
  }, [accounts, favoriteCodes]);

  const handleSelectAccountByCode = (code: string) => {
    const cleanCode = encodeURIComponent(code.replace('#', ''));
    router.push(`/account/${cleanCode}`);
  };

  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'home') {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (tab === 'news') {
      router.push('/tin-tuc');
    } else if (tab === 'search') {
      router.push('/search');
    } else if (tab === 'browse') {
      if (typeof window !== 'undefined') {
        const gridElem = document.getElementById('kho-nick');
        if (gridElem) {
          gridElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else if (tab === 'rankings') {
      if (typeof window !== 'undefined') {
        const topElem = document.getElementById('top-deposits');
        if (topElem) {
          topElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else if (tab === 'wishlist') {
      setIsCartOpen(true);
    } else if (tab === 'support') {
      setSupportModalOpen(true);
    }
  };

  // Maintenance View
  if (settings.maintenance?.enabled && !authLoading && !isAdmin) {
    return <MaintenanceView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white selection:bg-rose-600">
      {/* HEADER */}
      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        cartCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* MAIN CONTAINER WITH STICKY FLOATING SIDEBAR */}
      <div className="flex-1 w-full px-3 sm:px-5 lg:px-6 xl:px-8 pt-4 pb-20 flex gap-4 lg:gap-6 items-start">
        {/* STICKY FLOATING SIDEBAR DOCK */}
        <Sidebar
          activeTab={activeTab}
          onTabSelect={handleTabSelect}
          savedCount={favoritesCount}
        />

        {/* CENTER & RIGHT CONTENT */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          {/* TOP SECTION: Hero Banner + Top Nạp Tiền */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
            {/* Hero Banner Carousel */}
            <div className="lg:col-span-8 flex flex-col h-full">
              <HeroBanner
                slides={heroSlides}
                customBanners={customBanners}
                isLoading={false}
                onSelectAccount={handleSelectAccountByCode}
              />
            </div>

            {/* Top Nạp Tiền */}
            <div id="top-deposits" className="lg:col-span-4 flex flex-col h-full scroll-mt-24">
              <TopDeposits
                depositors={topDepositors}
                isLoading={topLoading}
                onRechargeClick={() => setDepositOpen(true)}
              />
            </div>
          </section>

          {/* CATEGORY TABS FILTER */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            categories={categories}
            isLoading={loading && categories.length <= 1}
          />

          {/* MAIN ACCOUNT GRID */}
          <section id="kho-nick" className="scroll-mt-24">
            <AccountGrid
              accounts={accounts}
              isLoading={loading}
              page={page}
              totalPages={totalPages}
              totalAccounts={totalCount}
              onPageChange={handlePageChange}
              onSelectAccount={(code: string) => handleSelectAccountByCode(code)}
              onToggleFavorite={toggleFavorite}
              favorites={favoriteCodes}
            />
          </section>

          {/* TRUST & PROOF SECTIONS */}
          <LiveActivityFeed />
          <MarketplaceStats />
          <CustomerReviews />
          <HowItWorks />
          <TrustSection />
          <FaqSection />

          {/* FOOTER */}
          <Footer />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION DRAWER */}
      <MobileNavigation
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        savedCount={favoritesCount}
      />

      {/* MODAL MUA NHANH (Lazy loaded) */}
      {selectedAccountForBuy && (
        <QuickBuyModal
          account={selectedAccountForBuy}
          isOpen={!!selectedAccountForBuy}
          onClose={() => setSelectedAccountForBuy(null)}
        />
      )}

      {/* MODAL NẠP TIỀN VÍ (Lazy loaded) */}
      {depositOpen && (
        <DepositModal
          open={depositOpen}
          onClose={() => setDepositOpen(false)}
        />
      )}

      {/* MODAL HỖ TRỢ CSKH 24/7 (Lazy loaded) */}
      {supportModalOpen && (
        <SupportModal
          open={supportModalOpen}
          onClose={() => {
            setSupportModalOpen(false);
            setActiveTab('home');
          }}
        />
      )}

      {/* CART DRAWER (Lazy loaded) */}
      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onRemoveItem={(code) => toggleFavorite(code)}
          onCheckout={(item) => {
            setIsCartOpen(false);
            setSelectedAccountForBuy(item);
          }}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import WheelCanvas from './WheelCanvas';
import RewardResultModal from './RewardResultModal';
import WheelRulesCard from './WheelRulesCard';
import SpinHistoryList from './SpinHistoryList';
import {
  Sparkles,
  Zap,
  RotateCw,
  Coins,
  Gift,
  Trophy,
  Clock,
  ShieldCheck,
  Wallet,
  LogIn,
  AlertCircle,
  PlusCircle,
  Gamepad2,
} from 'lucide-react';
import { App } from 'antd';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { useCart } from '@/components/cart/CartProvider';
import { useSettings } from '@/components/settings/SettingsProvider';
import { LuckyWheelClientData } from '@/types/lucky-wheel';

// Lazy load Modals & Drawers on-demand
const DepositModal = dynamic(() => import('@/components/payment/DepositModal'), {
  ssr: false,
});
const SupportModal = dynamic(() => import('@/components/common/SupportModal'), {
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/common/CartDrawer'), {
  ssr: false,
});

interface LuckyWheelClientViewProps {
  initialWheel: LuckyWheelClientData | null;
  initialWinners?: any[];
}

export default function LuckyWheelClientView({
  initialWheel,
  initialWinners = [],
}: LuckyWheelClientViewProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const { favoritesCount } = useFavorites();
  const cart = useCart();
  const { settings } = useSettings();

  const [wheel, setWheel] = useState<LuckyWheelClientData | null>(initialWheel);
  const [recentWinners, setRecentWinners] = useState<any[]>(initialWinners);
  const [userHistory, setUserHistory] = useState<any[]>([]);

  // Navigation & Modal states
  const [activeTab, setActiveTab] = useState('lucky-wheel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [winningResult, setWinningResult] = useState<any | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  // User Stats state
  const [userStats, setUserStats] = useState(
    initialWheel?.userStats || {
      freeSpinsRemaining: initialWheel?.freeSpinsPerUser || 0,
      bonusSpinsRemaining: 0,
      totalAvailableSpins: initialWheel?.freeSpinsPerUser || 0,
      dailySpinsRemaining: initialWheel?.dailySpinLimit || null,
      totalSpinsUsed: 0,
    }
  );

  // Fetch wheel detail & user stat khi user đăng nhập
  const fetchWheelData = useCallback(async () => {
    if (!wheel?.id && !wheel?.slug) return;
    try {
      const res = await fetch(`/api/lucky-wheel/${wheel.slug || wheel.id}`);
      const data = await res.json();
      if (data.success && data.wheel) {
        setWheel(data.wheel);
        if (data.wheel.userStats) {
          setUserStats(data.wheel.userStats);
        }
      }
    } catch {
      // Ignored
    }
  }, [wheel?.id, wheel?.slug]);

  // Fetch lịch sử quay & danh sách người trúng
  const fetchHistory = useCallback(async () => {
    if (!wheel?.id) return;
    try {
      const res = await fetch(`/api/lucky-wheel/${wheel.id}/history`);
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.recentWinners)) {
          setRecentWinners(data.recentWinners);
        }
        if (data.userHistory?.items && Array.isArray(data.userHistory.items)) {
          setUserHistory(data.userHistory.items);
        }
      }
    } catch {
      // Ignored
    }
  }, [wheel?.id]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWheelData();
      fetchHistory();
    }
  }, [isAuthenticated, fetchWheelData, fetchHistory]);

  // Countdown Timer nếu có endAt
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!wheel?.endAt) {
      setTimeLeft(null);
      return;
    }

    const calcTime = () => {
      const diff = new Date(wheel.endAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [wheel?.endAt]);

  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'home') {
      router.push('/');
    } else if (tab === 'search' || tab === 'browse') {
      router.push('/search');
    } else if (tab === 'news') {
      router.push('/tin-tuc');
    } else if (tab === 'wishlist') {
      router.push('/profile?tab=favorites');
    } else if (tab === 'support') {
      setSupportModalOpen(true);
    }
  };

  // Xử lý khi bấm nút "QUAY NGAY"
  const handleSpinClick = async () => {
    if (isSpinning || isRequesting) return;

    if (!wheel) {
      message.error('Vòng quay may mắn chưa sẵn sàng.');
      return;
    }

    // 1. Kiểm tra đăng nhập
    if (wheel.requireLogin && !isAuthenticated) {
      message.info('Vui lòng đăng nhập để tham gia Vòng Quay May Mắn!');
      router.push('/login?redirect=/vong-quay-may-man');
      return;
    }

    // 2. Kiểm tra số dư nếu không còn lượt free/bonus
    const hasFreeOrBonus = (userStats.totalAvailableSpins || 0) > 0;
    if (!hasFreeOrBonus && wheel.spinCost > 0) {
      const currentBalance = user?.balance || 0;
      if (currentBalance < wheel.spinCost) {
        message.warning(`Số dư ví của bạn không đủ (${currentBalance.toLocaleString('vi-VN')} ₫). Vui lòng nạp thêm!`);
        setDepositModalOpen(true);
        return;
      }
    }

    // 3. Kiểm tra giới hạn ngày
    if (userStats.dailySpinsRemaining !== null && userStats.dailySpinsRemaining <= 0) {
      message.warning('Bạn đã đạt giới hạn quay trong ngày hôm nay. Hãy quay lại vào ngày mai!');
      return;
    }

    setIsRequesting(true);

    try {
      // Tạo unique idempotency token
      const idempotencyKey = `spin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch(`/api/lucky-wheel/${wheel.id}/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Không thể thực hiện lượt quay. Vui lòng thử lại!');
        setIsRequesting(false);
        return;
      }

      // Lưu kết quả và kích hoạt animation quay trên Canvas
      setWinningResult(data);
      setTargetIndex(data.rewardIndex ?? 0);
      setIsSpinning(true);
    } catch {
      message.error('Lỗi kết nối máy chủ khi quay thưởng.');
    } finally {
      setIsRequesting(false);
    }
  };

  // Xử lý khi vòng quay đã dừng chính xác tại phần thưởng
  const handleSpinEnd = () => {
    setIsSpinning(false);
    setTargetIndex(null);

    if (winningResult) {
      // Cập nhật User Stats và số dư
      if (winningResult.userStats) {
        setUserStats(winningResult.userStats);
      }
      refreshUser();
      fetchHistory();

      // Mở modal chúc mừng
      setResultModalOpen(true);
    }
  };

  const freeRemaining = userStats.freeSpinsRemaining || 0;
  const bonusRemaining = userStats.bonusSpinsRemaining || 0;
  const totalFreeSpins = freeRemaining + bonusRemaining;
  const userBalance = user?.balance || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white selection:bg-rose-600">
      {/* HEADER */}
      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        cartCount={cart.cartCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* MAIN CONTAINER WITH STICKY FLOATING SIDEBAR */}
      <div className="flex-1 w-full px-3 sm:px-5 lg:px-6 xl:px-8 pt-4 pb-20 flex gap-4 lg:gap-6 items-start">
        {/* STICKY FLOATING SIDEBAR */}
        <Sidebar
          activeTab={activeTab}
          onTabSelect={handleTabSelect}
          savedCount={favoritesCount}
        />

        {/* MAIN LUCKY WHEEL CONTENT */}
        <main className="flex-1 min-w-0 flex flex-col gap-8">
          {!wheel ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-[#180817]/60 border border-white/5">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-pink-300">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Chưa có sự kiện vòng quay nào</h2>
              <p className="text-xs text-pink-300/60 max-w-md">
                Sự kiện vòng quay may mắn đang được chuẩn bị. Bạn hãy quay lại sau nhé!
              </p>
            </div>
          ) : (
            <>
              {/* 1. HERO HEADER BANNER */}
              <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-r from-[#1f071d] via-[#2a0c28] to-[#160414] border border-rose-500/20 p-6 md:p-10 shadow-2xl">
                {/* Glow Aura */}
                <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-rose-600/15 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sự Kiện Vòng Quay May Mắn</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                      {wheel.name}
                    </h1>

                    <p className="text-xs sm:text-sm text-pink-200/80 leading-relaxed">
                      {wheel.description ||
                        'Tham gia quay thưởng ngay hôm nay để có cơ hội trúng nick game cực phẩm, thẻ cào, mã giảm giá và hàng ngàn quà tặng giá trị!'}
                    </p>

                    {/* BADGES INFO */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                      <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-pink-200 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-rose-400" />
                        <span>{wheel.freeSpinsPerUser > 0 ? `Tặng ${wheel.freeSpinsPerUser} lượt quay đầu` : 'Sự kiện quà khủng'}</span>
                      </span>

                      <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-pink-200 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{wheel.spinCost > 0 ? `${wheel.spinCost.toLocaleString('vi-VN')} ₫ / lượt` : 'Quay Miễn Phí'}</span>
                      </span>

                      {wheel.dailySpinLimit && (
                        <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-pink-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tối đa {wheel.dailySpinLimit} lượt/ngày</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* COUNTDOWN CARD (NẾU CÓ THỜI HẠN) */}
                  {timeLeft && (
                    <div className="shrink-0 p-4 sm:p-5 rounded-3xl bg-black/40 border border-rose-500/30 backdrop-blur-xl flex flex-col items-center">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Thời Gian Còn Lại</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center p-2 min-w-[50px] rounded-xl bg-white/5 border border-white/10">
                          <span className="text-lg font-black text-white">{timeLeft.days}</span>
                          <span className="text-[9px] text-pink-300/60 uppercase">Ngày</span>
                        </div>
                        <span className="text-rose-500 font-bold">:</span>
                        <div className="flex flex-col items-center p-2 min-w-[50px] rounded-xl bg-white/5 border border-white/10">
                          <span className="text-lg font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                          <span className="text-[9px] text-pink-300/60 uppercase">Giờ</span>
                        </div>
                        <span className="text-rose-500 font-bold">:</span>
                        <div className="flex flex-col items-center p-2 min-w-[50px] rounded-xl bg-white/5 border border-white/10">
                          <span className="text-lg font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                          <span className="text-[9px] text-pink-300/60 uppercase">Phút</span>
                        </div>
                        <span className="text-rose-500 font-bold">:</span>
                        <div className="flex flex-col items-center p-2 min-w-[50px] rounded-xl bg-white/5 border border-white/10">
                          <span className="text-lg font-black text-rose-400 animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
                          <span className="text-[9px] text-pink-300/60 uppercase">Giây</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. MAIN SECTION: VÒNG QUAY & BẢNG LỊCH SỬ / QUY ĐỊNH */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* CỘT TRÁI (LỚN): VÒNG QUAY MAY MẮN */}
                <div className="lg:col-span-7 flex flex-col items-center rounded-[32px] bg-[#170516]/95 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
                  {/* USER SPINS STATUS BAR */}
                  <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/8 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <RotateCw className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] text-pink-300/60 block">Lượt quay có sẵn:</span>
                        <span className="text-sm font-black text-white">
                          {isAuthenticated ? (
                            <span className="text-emerald-400">
                              {totalFreeSpins > 0 ? `${totalFreeSpins} lượt miễn phí` : '0 lượt (dùng số dư ví)'}
                            </span>
                          ) : (
                            <span className="text-pink-300/60">Chưa đăng nhập</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAuthenticated ? (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[11px] text-pink-300/60 block">Số dư ví:</span>
                            <span className="text-sm font-bold text-amber-400">
                              {userBalance.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                          <button
                            onClick={() => setDepositModalOpen(true)}
                            className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                            title="Nạp tiền"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push('/login?redirect=/vong-quay-may-man')}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-rose-950/60"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Đăng Nhập</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CANVAS VÒNG QUAY */}
                  <div className="w-full flex justify-center my-2">
                    <WheelCanvas
                      rewards={wheel.rewards || []}
                      isSpinning={isSpinning}
                      targetIndex={targetIndex}
                      onSpinEnd={handleSpinEnd}
                    />
                  </div>

                  {/* CTA SPIN BUTTON */}
                  <div className="w-full max-w-md mt-6 flex flex-col items-center gap-3">
                    <button
                      onClick={handleSpinClick}
                      disabled={isSpinning || isRequesting}
                      className={`w-full py-4 px-8 rounded-2xl font-black text-base uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group cursor-pointer ${
                        isSpinning || isRequesting
                          ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/5'
                          : 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-rose-600/40 border border-rose-400/40 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {/* Hiệu ứng tia sáng quét ngang nút (Shine Sweep) */}
                      {!isSpinning && !isRequesting && (
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                      )}

                      {isRequesting ? (
                        <>
                          <RotateCw className="w-5 h-5 animate-spin text-white" />
                          <span>Đang Khởi Tạo...</span>
                        </>
                      ) : isSpinning ? (
                        <>
                          <Sparkles className="w-5 h-5 animate-spin text-amber-300" />
                          <span>Đang Quay Thưởng...</span>
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                          <span>QUAY NGAY</span>
                          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        </>
                      )}
                    </button>

                    {/* Phụ đề chi phí dưới nút */}
                    <span className="text-[11px] text-pink-300/60 text-center">
                      {totalFreeSpins > 0
                        ? `Đang dùng lượt miễn phí (${totalFreeSpins} lượt còn lại)`
                        : wheel.spinCost > 0
                        ? `Chi phí: ${wheel.spinCost.toLocaleString('vi-VN')} ₫ / lần quay (trừ vào số dư ví)`
                        : 'Lượt quay hoàn toàn miễn phí!'}
                    </span>
                  </div>
                </div>

                {/* CỘT PHẢI: LỊCH SỬ QUAY & THỂ LỆ */}
                <div className="lg:col-span-5 space-y-6">
                  <SpinHistoryList
                    recentWinners={recentWinners}
                    userHistory={userHistory}
                    isAuthenticated={isAuthenticated}
                    onRefresh={fetchHistory}
                  />

                  <WheelRulesCard wheel={wheel} />
                </div>
              </div>
            </>
          )}

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

      {/* MODAL KẾT QUẢ TRÚNG THƯỞNG */}
      <RewardResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        onSpinAgain={handleSpinClick}
        reward={winningResult?.reward}
        claimStatus={winningResult?.claimStatus}
        claimDetails={winningResult?.claimDetails}
        canSpinAgain={
          totalFreeSpins > 0 || (wheel && wheel.spinCost > 0 && userBalance >= wheel.spinCost) || wheel?.spinCost === 0
        }
      />

      {/* MODAL NẠP TIỀN */}
      {depositModalOpen && (
        <DepositModal
          open={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
        />
      )}

      {/* MODAL HỖ TRỢ CSKH 24/7 */}
      {supportModalOpen && (
        <SupportModal
          open={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
        />
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={() => {
            setIsCartOpen(false);
            router.push('/profile?tab=orders');
          }}
        />
      )}
    </div>
  );
}

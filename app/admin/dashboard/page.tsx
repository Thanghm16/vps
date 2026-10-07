'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { AdminOrder, GameSalesMetric, RevenueChartPoint } from '@/types/admin';
import StatCard from '@/components/admin/dashboard/StatCard';
import RevenueChart from '@/components/admin/dashboard/RevenueChart';
import SalesByGame from '@/components/admin/dashboard/SalesByGame';
import InventoryOverview from '@/components/admin/dashboard/InventoryOverview';
import RecentOrdersTable from '@/components/admin/dashboard/RecentOrdersTable';
import QuickActionButtons from '@/components/admin/dashboard/QuickActionButtons';
import OrderDetailDrawer from '@/components/admin/orders/OrderDetailDrawer';
import AccountFormModal from '@/components/admin/accounts/AccountFormModal';
import {
  DollarSign,
  ShoppingBag,
  Package,
  CheckCircle2,
  Users,
  Clock,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [stats, setStats] = useState({
    availableCount: 0,
    soldCount: 0,
    reservedCount: 0,
    hiddenCount: 0,
    totalAccounts: 0,
    totalGames: 0,
    revenueToday: 0,
    ordersToday: 0,
    newCustomers: 0,
    pendingTransactions: 0,
    totalRevenue: 0,
  });
  const [charts, setCharts] = useState<{
    data7d: RevenueChartPoint[];
    data30d: RevenueChartPoint[];
    data12m: RevenueChartPoint[];
  }>({
    data7d: [],
    data30d: [],
    data12m: [],
  });
  const [salesByGame, setSalesByGame] = useState<GameSalesMetric[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tải dữ liệu thống kê thật từ MongoDB qua /api/admin/stats
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.charts) setCharts(data.charts);
        if (data.salesByGame) setSalesByGame(data.salesByGame);
        if (data.recentOrders) setRecentOrders(data.recentOrders);
      }
    } catch (e) {
      console.warn('Dashboard stats fetch failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const availableAccountsCount = stats.availableCount;
  const soldAccountsCount = stats.soldCount;
  const reservedAccountsCount = stats.reservedCount;
  const hiddenAccountsCount = stats.hiddenCount;

  return (
    <div className="space-y-6 pb-12">
      {/* 0. HEADER TITLE & REFRESH BUTTON */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Bảng Điều Khiển Tổng Quan
          </h1>
          <p className="text-xs text-pink-200/60 mt-0.5">
            Dữ liệu thống kê doanh thu, đơn hàng và kho tài khoản thời gian thực
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e0a1c] hover:bg-[#2c0f29] border border-white/10 hover:border-rose-500/30 text-xs font-bold text-pink-200 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 1. TOP 6 STATISTIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Doanh Thu Hôm Nay"
          value={formatPrice(stats.revenueToday)}
          subtext="từ 0h00 đến nay"
          icon={DollarSign}
          iconColor="text-rose-400"
          gradient="from-rose-500/20 to-pink-500/10"
        />

        <StatCard
          title="Đơn Hàng Hôm Nay"
          value={stats.ordersToday}
          subtext="từ 0h00 đến nay"
          icon={ShoppingBag}
          iconColor="text-blue-400"
          gradient="from-blue-500/20 to-indigo-500/10"
        />

        <StatCard
          title="Nick Đang Bán"
          value={availableAccountsCount}
          subtext="kho hàng sẵn sàng"
          icon={Package}
          iconColor="text-emerald-400"
          gradient="from-emerald-500/20 to-teal-500/10"
        />

        <StatCard
          title="Nick Đã Bán"
          value={soldAccountsCount.toLocaleString('vi-VN')}
          subtext="tổng tích lũy sàn"
          icon={CheckCircle2}
          iconColor="text-purple-400"
          gradient="from-purple-500/20 to-pink-500/10"
        />

        <StatCard
          title="Khách Hàng Mới"
          value={stats.newCustomers}
          subtext="tháng này"
          icon={Users}
          iconColor="text-amber-400"
          gradient="from-amber-500/20 to-yellow-500/10"
        />

        <StatCard
          title="Giao Dịch Chờ"
          value={stats.pendingTransactions}
          subtext="cần đối soát nạp"
          icon={Clock}
          iconColor="text-yellow-400"
          gradient="from-yellow-500/20 to-amber-500/10"
        />
      </div>

      {/* 2. QUICK ACTION BAR */}
      <QuickActionButtons
        onAddNewAccount={() => setIsAddAccountOpen(true)}
        onAddNewBanner={() => {
          router.push('/admin/banners');
        }}
      />

      {/* 3. REVENUE CHART & SALES BY GAME (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <RevenueChart
            data7d={charts.data7d}
            data30d={charts.data30d}
            data12m={charts.data12m}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-4">
          <SalesByGame
            games={salesByGame}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 4. RECENT ORDERS & INVENTORY OVERVIEW (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <RecentOrdersTable
            orders={recentOrders}
            isLoading={isLoading}
            onViewOrder={(order) => setSelectedOrder(order)}
          />
        </div>
        <div className="lg:col-span-4">
          <InventoryOverview
            availableCount={availableAccountsCount}
            soldCount={soldAccountsCount}
            reservedCount={reservedAccountsCount}
            hiddenCount={hiddenAccountsCount}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* ORDER DETAIL DRAWER */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      {/* ADD NEW ACCOUNT MODAL */}
      <AccountFormModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onSave={async (accData) => {
          try {
            await fetch('/api/admin/accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(accData),
            });
            setIsAddAccountOpen(false);
            loadDashboardData();
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}

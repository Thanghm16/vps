'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatPrice } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DepositModal from '@/components/payment/DepositModal';
import QuickBuyModal from '@/components/account/QuickBuyModal';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { PopulatedFavoriteItem } from '@/types/db-favorite';
import {
  User,
  ShoppingBag,
  CreditCard,
  Star,
  LogOut,
  Wallet,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Shield,
  Clock,
  BadgeCheck,
  TrendingUp,
  MessageSquare,
  Lock,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
  Heart,
  Trash2,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { App, Rate, Pagination } from 'antd';

// ── Types ──────────────────────────────────────────────────────────────────
interface OrderRecord {
  id: string;
  code: string;
  accountCode: string;
  accountTitle: string;
  accountThumbnail: string;
  gameSlug: string;
  gameName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  credentials: {
    username?: string;
    password?: string;
    email?: string;
    emailPassword?: string;
    twoFactor?: string;
    notes?: string;
  };
  createdAt: string;
}

interface TransactionRecord {
  id: string;
  code: string;
  amount: number;
  paymentMethod: string;
  status: string;
  time: string;
  description?: string;
}

type ProfileTab = 'overview' | 'orders' | 'transactions' | 'favorites' | 'reviews';

// ── Modal xem thông tin đăng nhập ─────────────────────────────────────────
function CredentialViewer({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const downloadTxt = () => {
    const lines = [
      `=== THÔNG TIN ĐĂNG NHẬP - ${order.accountTitle} ===`,
      `Mã đơn hàng: ${order.code}`,
      `Game: ${order.gameName}`,
      `Thời gian mua: ${order.createdAt}`,
      ``,
      `--- THÔNG TIN TÀI KHOẢN ---`,
      `Tên đăng nhập: ${order.credentials.username || 'N/A'}`,
      `Mật khẩu: ${order.credentials.password || 'N/A'}`,
      order.credentials.email ? `Email: ${order.credentials.email}` : '',
      order.credentials.emailPassword ? `Mật khẩu Email: ${order.credentials.emailPassword}` : '',
      order.credentials.twoFactor ? `Mã 2FA / Backup: ${order.credentials.twoFactor}` : '',
      order.credentials.notes ? `\nGhi chú bảo hành: ${order.credentials.notes}` : '',
      ``,
      `=== BẢO MẬT: Không chia sẻ thông tin này với bất kỳ ai ===`,
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.code}-credentials.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  type FieldRowProps = {
    label: string;
    value?: string;
    fieldKey: string;
    isPassword?: boolean;
    showState?: boolean;
    toggleShow?: () => void;
  };

  const FieldRow = ({ label, value, fieldKey, isPassword, showState, toggleShow }: FieldRowProps) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-pink-300/60 font-medium uppercase tracking-wide mb-0.5">{label}</div>
          <div className="text-sm font-mono text-white/90 truncate">
            {isPassword && !showState ? '••••••••••••' : value}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPassword && toggleShow && (
            <button
              onClick={toggleShow}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300/70 hover:text-white transition-colors"
            >
              {showState ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => copyField(value, fieldKey)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-pink-300/70 hover:text-emerald-400 transition-colors"
          >
            {copiedField === fieldKey ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a0818] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header modal */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-rose-900/30 to-purple-900/30">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white">{order.accountTitle}</h3>
              <p className="text-xs text-pink-300/60 mt-0.5">Mã đơn: {order.code}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/50 hover:text-white transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nội dung credentials */}
        <div className="p-5 space-y-2.5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Thông Tin Đăng Nhập</span>
          </div>

          <FieldRow label="Tên đăng nhập" value={order.credentials.username} fieldKey="username" />
          <FieldRow
            label="Mật khẩu"
            value={order.credentials.password}
            fieldKey="password"
            isPassword
            showState={showPassword}
            toggleShow={() => setShowPassword(!showPassword)}
          />
          <FieldRow label="Email" value={order.credentials.email} fieldKey="email" />
          <FieldRow
            label="Mật khẩu Email"
            value={order.credentials.emailPassword}
            fieldKey="emailPassword"
            isPassword
            showState={showEmailPass}
            toggleShow={() => setShowEmailPass(!showEmailPass)}
          />
          <FieldRow label="Mã 2FA / Backup" value={order.credentials.twoFactor} fieldKey="twoFactor" />

          {order.credentials.notes && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/80">
              <span className="font-bold text-amber-400">📋 Ghi chú: </span>
              {order.credentials.notes}
            </div>
          )}

          <button
            onClick={downloadTxt}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600/80 to-purple-700/80 hover:from-rose-500 hover:to-purple-600 text-white text-sm font-semibold transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Tải File Thông Tin (.txt)
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[10px] text-center text-pink-300/40">
            🔒 Thông tin được mã hóa bảo mật. Không chia sẻ với bất kỳ ai.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Trang Thông Tin Cá Nhân ────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, refreshUser } = useAuth();
  const { message } = App.useApp();
  const { favoritesCount, removeFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [depositOpen, setDepositOpen] = useState(false);

  // Trạng thái đơn hàng
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<OrderRecord | null>(null);

  // Trạng thái giao dịch
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Trạng thái yêu thích
  const [favoritesList, setFavoritesList] = useState<PopulatedFavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favPage, setFavPage] = useState(1);
  const [favTotal, setFavTotal] = useState(0);
  const [favTotalPages, setFavTotalPages] = useState(1);
  const [selectedAccountForBuy, setSelectedAccountForBuy] = useState<any | null>(null);

  // Trạng thái đánh giá
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAccountBought, setReviewAccountBought] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Khởi tạo tab từ URL nếu có
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ProfileTab | null;
      if (tabParam && ['overview', 'orders', 'transactions', 'favorites', 'reviews'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?redirect=/profile');
    }
  }, [loading, isAuthenticated, router]);

  // Tải đơn hàng
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/user/orders');
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch {
      console.warn('Không thể tải đơn hàng');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Tải giao dịch
  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetch('/api/user/transactions?limit=50');
      const data = await res.json();
      if (data.success) setTransactions(data.transactions || []);
    } catch {
      console.warn('Không thể tải giao dịch');
    } finally {
      setTxLoading(false);
    }
  }, []);

  // Tải danh sách yêu thích
  const loadFavorites = useCallback(async (page = 1) => {
    setFavoritesLoading(true);
    try {
      const res = await fetch(`/api/favorites?page=${page}&limit=12`);
      const data = await res.json();
      if (data.success) {
        setFavoritesList(data.favorites || []);
        setFavTotal(data.pagination?.total || 0);
        setFavTotalPages(data.pagination?.totalPages || 1);
        setFavPage(page);
      }
    } catch {
      console.warn('Không thể tải danh sách yêu thích');
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  // Tải khi chuyển tab
  useEffect(() => {
    if (activeTab === 'orders' && orders.length === 0) loadOrders();
    if (activeTab === 'transactions' && transactions.length === 0) loadTransactions();
    if (activeTab === 'favorites') loadFavorites(1);
  }, [activeTab, orders.length, transactions.length, loadOrders, loadTransactions, loadFavorites]);

  const handleRemoveFavorite = async (accountCode: string) => {
    await removeFavorite(accountCode);
    setFavoritesList((prev) => prev.filter((item) => item.code !== accountCode));
    setFavTotal((prev) => Math.max(0, prev - 1));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      message.warning('Vui lòng nhập đầy đủ mật khẩu cũ và mới.');
      return;
    }
    if (newPassword.length < 6) {
      message.warning('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
      } else {
        message.error(data.message || 'Lỗi đổi mật khẩu.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim() || reviewComment.trim().length < 10) {
      message.warning('Nội dung đánh giá phải có ít nhất 10 ký tự.');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim(),
          accountBought: reviewAccountBought.trim() || 'Nick Game',
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message || 'Đã gửi đánh giá!');
        setReviewComment('');
        setReviewAccountBought('');
        setReviewRating(5);
      } else {
        message.error(data.message || 'Lỗi gửi đánh giá.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Màn hình loading
  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0c040b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-pink-200/60 text-sm">Đang tải trang cá nhân...</p>
        </div>
      </div>
    );
  }

  const navItems: { id: ProfileTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'overview', icon: <User className="w-4 h-4" />, label: 'Tổng Quan' },
    { id: 'orders', icon: <ShoppingBag className="w-4 h-4" />, label: 'Kho Nick Đã Mua' },
    { id: 'favorites', icon: <Heart className="w-4 h-4" />, label: 'Nick Yêu Thích', badge: favoritesCount },
    { id: 'transactions', icon: <CreditCard className="w-4 h-4" />, label: 'Lịch Sử Giao Dịch' },
    { id: 'reviews', icon: <Star className="w-4 h-4" />, label: 'Đánh Giá Của Tôi' },
  ];

  const statusColor = (status: string) => {
    if (status === 'completed' || status === 'success' || status === 'delivered')
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (status === 'pending') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const statusLabel = (status: string) => {
    if (status === 'completed' || status === 'success' || status === 'delivered') return '✓ Hoàn thành';
    if (status === 'pending') return '⏳ Đang xử lý';
    return '✕ Thất bại';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c040b] text-white">
      {/* HEADER dùng lại của trang chủ */}
      <Header onOpenMobileMenu={() => {}} onOpenCart={() => {}} />

      {/* NỘI DUNG CHÍNH */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6 items-start">
        {/* ── SIDEBAR ── */}
        <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-4">
          {/* Card hồ sơ */}
          <div className="p-5 rounded-2xl bg-[#190918]/80 border border-white/8 shadow-xl">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-600 to-purple-800 flex items-center justify-center text-3xl font-black text-white shadow-xl ring-2 ring-rose-500/30 mb-3">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-base font-bold text-white">{user.username}</h2>
              {user.userCode && (
                <span className="text-[10px] text-pink-300/50 font-mono mt-0.5">#{user.userCode}</span>
              )}
              <div className="mt-2 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/20 text-[10px] font-bold text-rose-300 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                {user.role === 'admin' ? 'Quản Trị Viên' : 'Thành Viên'}
              </div>
            </div>

            {/* Số dư */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-rose-900/40 to-purple-900/40 border border-rose-500/15 mb-4">
              <div className="text-[10px] text-pink-300/60 uppercase tracking-wider mb-1">Số Dư Ví</div>
              <div className="text-xl font-black text-white">{formatPrice(user.balance || 0)}</div>
              <button
                onClick={() => setDepositOpen(true)}
                className="mt-2 w-full py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Wallet className="w-3 h-3" />
                Nạp Tiền
              </button>
            </div>

            {/* Menu điều hướng */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-rose-600/30 to-purple-700/20 text-white border border-rose-500/20'
                      : 'text-pink-200/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activeTab === item.id ? 'text-rose-400' : 'text-pink-300/50'}>{item.icon}</span>
                    {item.label}
                  </div>
                  {typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}

              {/* Nút đăng xuất */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-2 border-t border-white/5 pt-3"
              >
                <LogOut className="w-4 h-4" />
                Đăng Xuất
              </button>
            </nav>
          </div>

          {/* Thống kê nhanh */}
          <div className="p-4 rounded-2xl bg-[#190918]/60 border border-white/5">
            <div className="text-[10px] text-pink-300/40 uppercase tracking-wider mb-3">Thống Kê</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-pink-200/60 flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3" /> Nick đã mua
                </span>
                <span className="font-bold text-white">{orders.length || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-pink-200/60 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Tổng chi tiêu
                </span>
                <span className="font-bold text-white">
                  {orders.length > 0 ? formatPrice(orders.reduce((s, o) => s + o.amount, 0)) : '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── NỘI DUNG TAB ── */}
        <main className="flex-1 min-w-0">
          {/* Tab selector mobile */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-rose-600 to-purple-700 text-white'
                    : 'bg-white/5 text-pink-200/60 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* ═══ TAB 1: TỔNG QUAN ══════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <h1 className="text-xl font-black text-white">Tổng Quan Tài Khoản</h1>

              {/* Thẻ thống kê */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#190918]/80 border border-white/8">
                  <div className="text-[10px] text-pink-300/60 uppercase tracking-wider mb-1.5">Số Dư Hiện Tại</div>
                  <div className="text-lg font-black text-white">{formatPrice(user.balance || 0)}</div>
                  <button
                    onClick={() => setDepositOpen(true)}
                    className="mt-2 text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Wallet className="w-3 h-3" /> Nạp ngay
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#190918]/80 border border-white/8">
                  <div className="text-[10px] text-pink-300/60 uppercase tracking-wider mb-1.5">Nick Đã Mua</div>
                  <div className="text-lg font-black text-white">{orders.length}</div>
                  <button
                    onClick={() => { setActiveTab('orders'); loadOrders(); }}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <ShoppingBag className="w-3 h-3" /> Xem kho
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#190918]/80 border border-white/8 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-pink-300/60 uppercase tracking-wider mb-1.5">Tài Khoản</div>
                  <div className="text-sm font-bold text-white truncate">{user.username}</div>
                  <div className="text-[10px] text-pink-300/50 mt-0.5 truncate">{user.email}</div>
                  {user.userCode && (
                    <div className="mt-1 text-[10px] text-amber-400/80 font-mono">#{user.userCode}</div>
                  )}
                </div>
              </div>

              {/* Form đổi mật khẩu */}
              <div className="p-5 rounded-2xl bg-[#190918]/80 border border-white/8">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  Đổi Mật Khẩu
                </h3>
                <div className="space-y-3 max-w-sm">
                  <div>
                    <label className="text-[11px] text-pink-300/60 font-medium block mb-1">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-pink-300/60 font-medium block mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-700 hover:from-rose-500 hover:to-purple-600 disabled:opacity-50 text-white text-sm font-bold transition-all"
                  >
                    {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                    Đổi Mật Khẩu
                  </button>
                </div>
              </div>

              {/* Thông tin tài khoản */}
              <div className="p-5 rounded-2xl bg-[#190918]/80 border border-white/8">
                <h3 className="text-sm font-bold text-white mb-4">Thông Tin Tài Khoản</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Tên đăng nhập', value: user.username },
                    { label: 'Email', value: user.email },
                    { label: 'Vai trò', value: user.role === 'admin' ? 'Quản trị viên' : 'Người dùng' },
                    {
                      label: 'Ngày tham gia',
                      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—',
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-pink-300/60">{row.label}</span>
                      <span className="text-white font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 2: KHO NICK ═══════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-white">Kho Nick Đã Mua</h1>
                <button
                  onClick={loadOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tải lại
                </button>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingBag className="w-12 h-12 text-pink-300/20 mb-3" />
                  <p className="text-pink-200/60 text-sm">Bạn chưa mua nick nào.</p>
                  <Link href="/" className="mt-3 text-xs text-rose-400 hover:text-rose-300 font-semibold">
                    → Xem kho nick
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-[#190918]/80 border border-white/8 hover:border-rose-500/20 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-900/60 to-purple-900/60 border border-white/10 flex items-center justify-center flex-shrink-0 text-2xl">
                          🎮
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <h3 className="text-sm font-bold text-white truncate">{order.accountTitle}</h3>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-pink-300/50 font-mono">{order.code}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20">
                                  {order.gameName}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor(order.status)}`}>
                                  {statusLabel(order.status)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-black text-white">{formatPrice(order.amount)}</div>
                              <div className="text-[10px] text-pink-300/40 mt-0.5">{order.createdAt}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <button
                              onClick={() => setSelectedOrderForView(order)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all border border-rose-500/20"
                            >
                              <Eye className="w-3 h-3" />
                              Xem Thông Tin Đăng Nhập
                            </button>
                            <button
                              onClick={() => {
                                setReviewAccountBought(order.accountCode);
                                setActiveTab('reviews');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all border border-amber-500/15"
                            >
                              <Star className="w-3 h-3" />
                              Viết Đánh Giá
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB: NICK YÊU THÍCH ═══════════════════════════════════════ */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                    Sản Phẩm Yêu Thích
                  </h1>
                  <p className="text-xs text-pink-200/50 mt-0.5">
                    Danh sách các tài khoản game bạn đã lưu ({favTotal} tài khoản)
                  </p>
                </div>
                <button
                  onClick={() => loadFavorites(favPage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tải lại
                </button>
              </div>

              {favoritesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                </div>
              ) : favoritesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center p-8 rounded-2xl bg-[#190918]/50 border border-white/5">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-rose-400/60" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Chưa có tài khoản yêu thích nào</h3>
                  <p className="text-pink-200/50 text-xs max-w-sm mb-5">
                    Hãy bấm biểu tượng trái tim trên các tài khoản bạn quan tâm để lưu lại và theo dõi giá dễ dàng hơn!
                  </p>
                  <Link
                    href="/"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-700 hover:from-rose-500 hover:to-purple-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Khám Phá Nick Game Ngay
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favoritesList.map((item) => {
                      const isAvailable = item.status === 'available';
                      const discount =
                        item.originalPrice && item.originalPrice > item.price
                          ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
                          : 0;

                      return (
                        <div
                          key={item.id}
                          className="group rounded-2xl bg-[#190918]/80 border border-white/8 hover:border-rose-500/30 transition-all duration-300 overflow-hidden flex flex-col shadow-lg hover:shadow-rose-900/20"
                        >
                          {/* Thumbnail & Game badge */}
                          <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl text-pink-300/30">
                                🎮
                              </div>
                            )}

                            {/* Game name badge */}
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-purple-300 border border-white/10">
                              {item.gameName}
                            </span>

                            {/* Status badge */}
                            <span
                              className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-md border ${
                                isAvailable
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}
                            >
                              {isAvailable ? 'Sẵn sàng' : 'Đã bán'}
                            </span>

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveFavorite(item.code)}
                              title="Bỏ thích"
                              className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-black/70 hover:bg-rose-600/90 text-white/80 hover:text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Content */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-pink-300/50 font-mono">#{item.code}</span>
                                {discount > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    -{discount}%
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-bold text-white line-clamp-2 mb-2 group-hover:text-rose-300 transition-colors">
                                {item.title}
                              </h3>

                              {/* Tags */}
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {item.tags.slice(0, 3).map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-pink-200/60 border border-white/5"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Price & Action */}
                            <div className="pt-3 border-t border-white/5">
                              <div className="flex items-baseline justify-between mb-3">
                                <div>
                                  <div className="text-base font-black text-rose-400">
                                    {formatPrice(item.price)}
                                  </div>
                                  {item.originalPrice && item.originalPrice > item.price && (
                                    <div className="text-[10px] text-pink-300/40 line-through">
                                      {formatPrice(item.originalPrice)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-pink-300/40">
                                  {item.favoritedAt ? new Date(item.favoritedAt).toLocaleDateString('vi-VN') : ''}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Link
                                  href={`/?account=${item.code}`}
                                  className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200/80 hover:text-white text-xs font-semibold transition-all border border-white/5"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Chi tiết
                                </Link>

                                {isAvailable ? (
                                  <button
                                    onClick={() => setSelectedAccountForBuy(item)}
                                    className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-700 hover:from-rose-500 hover:to-purple-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/20"
                                  >
                                    <Zap className="w-3 h-3" />
                                    Mua Ngay
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white/5 text-pink-300/30 text-xs font-semibold cursor-not-allowed"
                                  >
                                    Đã Bán
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {favTotalPages > 1 && (
                    <div className="flex justify-center pt-6">
                      <Pagination
                        current={favPage}
                        pageSize={12}
                        total={favTotal}
                        onChange={(p) => loadFavorites(p)}
                        showSizeChanger={false}
                        className="custom-ant-pagination"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ TAB 3: LỊCH SỬ GIAO DỊCH ════════════════════════════════ */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-white">Lịch Sử Giao Dịch</h1>
                <button
                  onClick={loadTransactions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tải lại
                </button>
              </div>

              {txLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CreditCard className="w-12 h-12 text-pink-300/20 mb-3" />
                  <p className="text-pink-200/60 text-sm">Chưa có giao dịch nào.</p>
                  <button
                    onClick={() => setDepositOpen(true)}
                    className="mt-3 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    → Nạp tiền ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-4 rounded-xl bg-[#190918]/80 border border-white/8 hover:border-white/12 transition-all"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          tx.amount > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : '−'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">
                            {tx.amount > 0 ? '+' : ''}{formatPrice(Math.abs(tx.amount))}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor(tx.status)}`}>
                            {statusLabel(tx.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-pink-300/50 font-mono">{tx.code}</span>
                          {tx.description && (
                            <span className="text-[10px] text-pink-300/40 truncate max-w-[200px]">{tx.description}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] text-pink-300/40 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {tx.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 4: ĐÁNH GIÁ ══════════════════════════════════════════ */}
          {activeTab === 'reviews' && (
            <div className="space-y-5">
              <h1 className="text-xl font-black text-white">Đánh Giá Website</h1>

              {/* Form gửi đánh giá */}
              <div className="p-5 rounded-2xl bg-[#190918]/80 border border-white/8">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Chia Sẻ Trải Nghiệm Của Bạn
                </h3>

                <div className="space-y-4">
                  {/* Số sao */}
                  <div>
                    <label className="text-[11px] text-pink-300/60 font-medium block mb-2">Đánh giá sao</label>
                    <Rate value={reviewRating} onChange={setReviewRating} />
                  </div>

                  {/* Nick đã mua */}
                  <div>
                    <label className="text-[11px] text-pink-300/60 font-medium block mb-1">
                      Nick đã mua (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={reviewAccountBought}
                      onChange={(e) => setReviewAccountBought(e.target.value)}
                      placeholder="VD: Nick Liên Quân #LQ10291"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 transition-all"
                    />
                  </div>

                  {/* Nội dung đánh giá */}
                  <div>
                    <label className="text-[11px] text-pink-300/60 font-medium block mb-1">
                      Nội dung đánh giá <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm mua nick của bạn tại đây... (tối thiểu 10 ký tự)"
                      rows={4}
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 transition-all resize-none"
                    />
                    <div className="text-[10px] text-pink-300/40 mt-1 text-right">{reviewComment.length} / 500</div>
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-rose-900/30"
                  >
                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gửi Đánh Giá
                  </button>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300/80">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Đánh giá của bạn sẽ hiển thị công khai trên trang chủ và giúp cộng đồng game thủ tin tưởng vào chất lượng dịch vụ. Mỗi tài khoản chỉ được gửi 1 đánh giá, bạn có thể cập nhật bất kỳ lúc nào.
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FOOTER dùng lại của trang chủ */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <Footer />
      </div>

      {/* Modal nạp tiền */}
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />

      {/* Modal xem thông tin đăng nhập */}
      {selectedOrderForView && (
        <CredentialViewer
          order={selectedOrderForView}
          onClose={() => setSelectedOrderForView(null)}
        />
      )}

      {/* Quick Buy Modal */}
      {selectedAccountForBuy && (
        <QuickBuyModal
          account={selectedAccountForBuy}
          isOpen={!!selectedAccountForBuy}
          onClose={() => setSelectedAccountForBuy(null)}
          onOpenDeposit={() => {
            setSelectedAccountForBuy(null);
            setDepositOpen(true);
          }}
          onPurchaseSuccess={() => {
            refreshUser();
            loadFavorites(favPage);
          }}
        />
      )}
    </div>
  );
}

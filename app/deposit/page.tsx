'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatPrice } from '@/lib/utils';
import { PublicBankInfo, PublicPaymentSettings } from '@/types/bank';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  QrCode,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Wallet,
  LogIn,
  HelpCircle,
  Clock,
  History,
  CheckCircle2,
  Download,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { message, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface UserTransactionItem {
  id: string;
  code: string;
  orderCode?: string;
  amount: number;
  paymentMethod: string;
  status: string;
  time: string;
  bankReference?: string;
  description?: string;
}

const PRESET_AMOUNTS = [
  { value: 20000, label: '20.000 ₫' },
  { value: 50000, label: '50.000 ₫' },
  { value: 100000, label: '100.000 ₫', popular: true },
  { value: 200000, label: '200.000 ₫' },
  { value: 500000, label: '500.000 ₫' },
  { value: 1000000, label: '1.000.000 ₫' },
  { value: 2000000, label: '2.000.000 ₫' },
  { value: 5000000, label: '5.000.000 ₫' },
];

export default function DepositPage() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentSettings | null>(null);
  const [selectedBank, setSelectedBank] = useState<PublicBankInfo | null>(null);
  const [amount, setAmount] = useState<number>(100000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('100000');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<UserTransactionItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [successNotified, setSuccessNotified] = useState(false);
  const customDepositAmountInputId = useId();

  // Load public payment settings
  const fetchPaymentConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/banks?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPaymentConfig(json.data);
        const banks: PublicBankInfo[] = json.data.banks || [];
        const defaultB = banks.find((b) => b.isDefault) || banks[0];
        setSelectedBank((prev) => {
          if (!prev) return defaultB || null;
          const matched = banks.find((b) => b.id === prev.id || b.bankCode === prev.bankCode);
          return matched || defaultB || null;
        });
      }
    } catch (e) {
      console.warn('Load payment banks failed:', e);
    }
  }, []);

  // Load user transactions
  const fetchUserTransactions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingTx(true);
      const res = await fetch('/api/user/transactions?page=1&limit=10');
      const json = await res.json();
      if (json.success && Array.isArray(json.transactions)) {
        setTransactions(json.transactions);
      }
    } catch (e) {
      console.warn('Fetch user transactions error:', e);
    } finally {
      setLoadingTx(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPaymentConfig();
    if (user) {
      setInitialBalance(user.balance || 0);
    }
  }, [fetchPaymentConfig, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserTransactions();
    }
  }, [isAuthenticated, fetchUserTransactions]);

  // Transfer syntax based on UserCode (Method 1: NAP [userCode])
  const transferPrefix = paymentConfig?.depositPrefix || 'NAP';
  const transferCode = user?.userCode ? String(user.userCode) : user?.username || 'khach';
  const transferContent = `${transferPrefix} ${transferCode}`.toUpperCase();

  // Manual check balance & refresh transactions
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleCheckBalance = async () => {
    try {
      setIsRefreshing(true);
      const updated = await refreshUser();
      await fetchUserTransactions();
      if (updated) {
        message.success(`Đã cập nhật số dư: ${formatPrice(updated.balance || 0)}`);
      }
    } catch {
      message.error('Không thể kiểm tra số dư lúc này.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    message.success(`Đã sao chép ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmountStr(String(val));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmountStr(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      setAmount(num);
    } else {
      setAmount(0);
    }
  };

  // VietQR Image URL
  const qrUrl = selectedBank
    ? `https://img.vietqr.io/image/${selectedBank.bankCode}-${selectedBank.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
        transferContent
      )}&accountName=${encodeURIComponent(selectedBank.accountHolder)}`
    : '';

  const txColumns: ColumnsType<UserTransactionItem> = [
    {
      title: 'MÃ GIAO DỊCH',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <span className="font-mono font-bold text-rose-400 text-xs">{code}</span>,
    },
    {
      title: 'MỤC ĐÍCH',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (orderCode: string) => (
        <span className="text-xs text-pink-100 font-medium">
          {orderCode ? `Mua đơn ${orderCode}` : 'Nạp tiền vào ví'}
        </span>
      ),
    },
    {
      title: 'SỐ TIỀN',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => (
        <span className="font-black text-emerald-400 text-xs">+{formatPrice(amt)}</span>
      ),
    },
    {
      title: 'CỔNG',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-pink-200 border border-white/10">
          {method}
        </span>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : status === 'pending' ? 'warning' : 'error'}>
          {status === 'success' ? 'Thành công' : status === 'pending' ? 'Chờ đối soát' : 'Thất bại'}
        </Tag>
      ),
    },
    {
      title: 'THỜI GIAN',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => <span className="text-xs text-pink-300/60">{time}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a030a] text-white flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
        {/* HERO TITLE & BREADCRUMB */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-pink-300/60">
            <Link href="/" className="hover:text-rose-400 transition">Trang Chủ</Link>
            <span>/</span>
            <span className="text-white font-semibold">Nạp Tiền Vào Ví</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Nạp Tiền Vào Ví Tự Động</span>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  VietQR 24/7 SePay
                </span>
              </h1>
              <p className="text-sm text-pink-300/60 mt-1">
                Quét mã QR qua mọi ứng dụng ngân hàng tại Việt Nam (MBBank, Vietcombank, BIDV, Techcombank, Momo, ZaloPay...)
              </p>
            </div>

            {isAuthenticated && user && (
              <div className="flex items-center gap-3 p-3.5 px-5 rounded-2xl bg-[#1d081b] border border-rose-500/20 shadow-lg shadow-rose-950/40">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{user.username}</span>
                    {user.userCode && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ID: #{user.userCode}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-emerald-400">{formatPrice(user.balance || 0)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NOT LOGGED IN BANNER */}
        {!isAuthenticated ? (
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-[#20091e] to-[#140614] border border-rose-500/30 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <LockUserIcon />
            </div>
            <div className="max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-white">Vui lòng đăng nhập để thực hiện nạp tiền</h2>
              <p className="text-xs text-pink-300/60 mt-1.5">
                Cú pháp nạp tiền tự động cần liên kết với tên đăng nhập của bạn để hệ thống SePay Webhook cộng tiền ngay lập tức.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 !text-white font-bold text-sm shadow-lg shadow-rose-600/40 hover:scale-105 transition"
                style={{ color: '#ffffff' }}
              >
                <LogIn className="w-4 h-4 !text-white" />
                <span className="!text-white font-bold">Đăng Nhập Tài Khoản</span>
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-pink-200 font-bold text-sm border border-white/10 transition"
              >
                Đăng Ký Mới
              </Link>
            </div>
          </div>
        ) : (
          /* MAIN TWO-COLUMN DEPOSIT SECTION */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: CONFIGURATION (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* STEP 1: SELECT BANK */}
              <div className="p-6 rounded-3xl bg-[#170616]/90 border border-white/5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    Chọn Ngân Hàng Nhận
                  </h3>
                  <span className="text-[11px] text-pink-300/50">Hỗ trợ đối soát tự động 24/7</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentConfig?.banks.map((bank) => {
                    const isSelected = selectedBank?.id === bank.id;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-3.5 rounded-2xl border text-left transition relative flex items-center justify-between ${
                          isSelected
                            ? 'bg-rose-600/20 border-rose-500 text-white shadow-lg shadow-rose-600/20'
                            : 'bg-white/5 border-white/5 text-pink-200/70 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">{bank.bankCode}</span>
                            {bank.isDefault && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/30 text-rose-300">
                                Ưu tiên
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-pink-300/60 block truncate font-mono mt-0.5">
                            STK: {bank.accountNumber}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: SELECT AMOUNT */}
              <div className="p-6 rounded-3xl bg-[#170616]/90 border border-white/5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    Chọn Số Tiền Cần Nạp
                  </h3>
                  <span className="text-[11px] text-pink-300/50">Tối thiểu: {formatPrice(paymentConfig?.minDepositAmount || 10000)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isSelected = amount === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleSelectPreset(preset.value)}
                        className={`py-3 px-2 rounded-2xl text-xs font-bold border transition relative text-center ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                            : 'bg-white/5 text-pink-200/80 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {preset.label}
                        {preset.popular && !isSelected && (
                          <span className="absolute -top-2 -right-1 text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-500 text-black rounded-full">
                            HOT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label htmlFor={customDepositAmountInputId} className="text-xs text-pink-300/60 block font-medium">Hoặc nhập số tiền tùy chọn (VNĐ):</label>
                  <div className="relative">
                    <input
                      id={customDepositAmountInputId}
                      type="text"
                      value={customAmountStr}
                      onChange={handleCustomAmountChange}
                      placeholder="VD: 350000"
                      className="w-full h-12 pl-4 pr-16 rounded-2xl bg-black/40 border border-white/10 text-white font-mono text-base font-bold focus:border-rose-500 outline-none transition"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-pink-300/50 font-bold">
                      VNĐ
                    </span>
                  </div>
                  {amount < (paymentConfig?.minDepositAmount || 10000) && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Số tiền nạp tối thiểu là {formatPrice(paymentConfig?.minDepositAmount || 10000)}
                    </p>
                  )}
                </div>
              </div>

              {/* STEP 3: TRANSFER DETAILS WITH ONE-CLICK COPY */}
              <div className="p-6 rounded-3xl bg-[#170616]/90 border border-white/5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  Thông Tin Chuyển Khoản Chi Tiết
                </h3>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-pink-300/60">Ngân hàng:</span>
                    <span className="font-bold text-white">{selectedBank?.bankName || selectedBank?.bankCode}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-pink-300/60">Chủ tài khoản:</span>
                    <span className="font-bold text-white uppercase">{selectedBank?.accountHolder}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-pink-300/60">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400 text-sm">{selectedBank?.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedBank?.accountNumber || '', 'Số tài khoản')}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-pink-200 transition"
                        title="Sao chép STK"
                      >
                        {copiedField === 'Số tài khoản' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-pink-300/60">Số tiền:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-emerald-400 text-sm">{formatPrice(amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(String(amount), 'Số tiền')}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-pink-200 transition"
                        title="Sao chép số tiền"
                      >
                        {copiedField === 'Số tiền' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 bg-amber-500/10 -mx-4 px-4 rounded-xl border border-amber-500/20">
                    <div>
                      <span className="text-amber-300 font-bold block">Nội dung chuyển khoản (bắt buộc):</span>
                      <span className="text-[11px] text-pink-300/60">Chỉ điền đúng cú pháp để được cộng tự động</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-300 text-base bg-black/40 px-3 py-1 rounded-lg border border-amber-500/30">
                        {transferContent}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(transferContent, 'Nội dung chuyển tiền')}
                        className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-600/30"
                        title="Sao chép cú pháp"
                      >
                        {copiedField === 'Nội dung chuyển tiền' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: VIETQR DISPLAY (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-24 p-6 rounded-3xl bg-gradient-to-b from-[#210920] to-[#120412] border border-rose-500/30 shadow-2xl flex flex-col items-center text-center space-y-5">
                <div className="w-full flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <QrCode className="w-4 h-4 text-rose-400" />
                    Mã VietQR Tự Động
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Đang đợi thanh toán
                  </div>
                </div>

                {/* QR Image Frame */}
                <div className="relative p-4 bg-white rounded-3xl shadow-2xl border-4 border-rose-500/40">
                  {qrUrl ? (
                    <Image
                      src={qrUrl}
                      alt="Mã VietQR SePay"
                      width={260}
                      height={260}
                      className="rounded-xl object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-[260px] h-[260px] bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                      Đang khởi tạo VietQR...
                    </div>
                  )}
                </div>

                {/* QR Quick Details */}
                <div className="w-full space-y-2">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <span className="text-pink-300/60">Số tiền:</span>
                    <span className="font-black text-rose-400 text-base">{formatPrice(amount)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <span className="text-pink-300/60">Cú pháp:</span>
                    <span className="font-mono font-bold text-amber-300">{transferContent}</span>
                  </div>
                </div>

                {/* Manual Refresh Action */}
                <button
                  type="button"
                  onClick={handleCheckBalance}
                  disabled={isRefreshing}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 !text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  style={{ color: '#ffffff' }}
                >
                  <RefreshCw className={`w-4 h-4 !text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="!text-white font-bold">{isRefreshing ? 'Đang kiểm tra...' : 'Tôi Đã Chuyển Tiền - Kiểm Tra Số Dư'}</span>
                </button>

                {/* Quick Help */}
                <div className="text-[11px] text-pink-300/50 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hỗ trợ sự cố nạp tiền 24/7: <strong>{paymentConfig?.hotline || '1900 8888'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: USER TRANSACTIONS HISTORY */}
        {isAuthenticated && (
          <div className="p-6 md:p-8 rounded-3xl bg-[#170616]/90 border border-white/5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-400" />
                  Lịch Sử Giao Dịch Của Bạn
                </h3>
                <p className="text-xs text-pink-300/50">Danh sách các lần nạp tiền và mua nick game gần nhất</p>
              </div>

              <button
                type="button"
                onClick={() => fetchUserTransactions()}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 text-xs font-semibold border border-white/10 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTx ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            <div className="overflow-x-auto">
              <Table
                loading={loadingTx}
                columns={txColumns}
                dataSource={transactions}
                rowKey="id"
                pagination={{ pageSize: 5, showSizeChanger: false }}
                locale={{ emptyText: <span className="text-xs text-pink-300/40 py-6 block">Chưa có giao dịch nạp tiền nào</span> }}
              />
            </div>
          </div>
        )}
      </main>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <Footer />
      </div>
    </div>
  );
}

function LockUserIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

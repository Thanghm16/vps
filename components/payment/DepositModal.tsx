'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatPrice } from '@/lib/utils';
import { PublicBankInfo, PublicPaymentSettings } from '@/types/bank';
import {
  X,
  QrCode,
  Copy,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Wallet,
  LogIn,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Modal, message, Tooltip } from 'antd';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000, 2000000];

export default function DepositModal({ open, onClose, defaultAmount = 100000 }: DepositModalProps) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentSettings | null>(null);
  const [selectedBank, setSelectedBank] = useState<PublicBankInfo | null>(null);
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customAmountStr, setCustomAmountStr] = useState<string>(String(defaultAmount));
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [successNotified, setSuccessNotified] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const customAmountInputId = useId();

  // Load public payment settings
  const fetchPaymentConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
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
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPaymentConfig();
      setSuccessNotified(false);
      if (user) {
        setInitialBalance(user.balance || 0);
      }
    }
  }, [open, fetchPaymentConfig, user]);

  // Transfer syntax based on UserCode (Method 1: NAP [userCode])
  const transferPrefix = paymentConfig?.depositPrefix || 'NAP';
  const transferCode = user?.userCode ? String(user.userCode) : user?.username || 'khach';
  const transferContent = `${transferPrefix} ${transferCode}`.toUpperCase();

  // Manual refresh balance
  const [checkingBalance, setCheckingBalance] = useState(false);
  const handleCheckBalance = async () => {
    try {
      setCheckingBalance(true);
      const updated = await refreshUser();
      if (updated) {
        message.success(`Số dư hiện tại: ${formatPrice(updated.balance || 0)}`);
      }
    } catch {
      message.error('Không thể kiểm tra số dư lúc này.');
    } finally {
      setCheckingBalance(false);
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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      destroyOnClose
      closeIcon={null}
      className="custom-deposit-modal"
      styles={{
        body: {
          background: 'transparent',
          padding: 0,
        },
      }}
    >
      <div className="relative overflow-hidden rounded-[32px] bg-[#140614]/95 backdrop-blur-2xl border border-rose-500/20 shadow-2xl text-white">
        {/* Glow ambient effects */}
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-rose-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="relative z-10 flex items-center justify-between p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">Nạp Tiền Vào Ví Tự Động</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  VietQR 24/7 SePay
                </span>
              </div>
              <p className="text-xs text-pink-300/60 font-medium">
                Quét mã QR qua app ngân hàng - Tiền vào ví sau 3 đến 10 giây
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white transition"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AUTH CHECK BANNER */}
        {!isAuthenticated ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <Wallet className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h4 className="text-base font-bold text-white">Bạn cần đăng nhập để nạp tiền</h4>
              <p className="text-xs text-pink-300/60 mt-1">
                Đăng nhập tài khoản giúp hệ thống nhận diện cú pháp nạp tiền chính xác của bạn và cộng tiền tự động.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/login"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 !text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:scale-105 transition"
                style={{ color: '#ffffff' }}
              >
                <LogIn className="w-4 h-4 !text-white" />
                <span className="!text-white font-bold">Đăng Nhập Ngay</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* LEFT COLUMN: OPTIONS & PRESETS (7 cols) */}
            <div className="md:col-span-7 space-y-5">
              {/* User Balance Info */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-pink-300/60 block">Tài khoản nạp</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{user?.username}</span>
                      {user?.userCode && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ID: #{user.userCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-pink-300/60 block">Số dư hiện tại</span>
                  <span className="text-xs font-black text-emerald-400">{formatPrice(user?.balance || 0)}</span>
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="text-xs font-bold text-pink-200 block mb-2">
                  1. Chọn Ngân Hàng Nhận
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentConfig?.banks.map((bank) => {
                    const isSelected = selectedBank?.id === bank.id;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-2.5 rounded-2xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-rose-600/20 border-rose-500 text-white shadow-md shadow-rose-600/20'
                            : 'bg-white/5 border-white/5 text-pink-200/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-bold text-xs block text-white">{bank.bankCode}</span>
                          <span className="text-[10px] text-pink-300/50 block truncate font-mono">
                            {bank.accountNumber}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-rose-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label htmlFor={customAmountInputId} className="text-xs font-bold text-pink-200 block mb-2">
                  2. Chọn Hoặc Nhập Số Tiền Cần Nạp
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2.5">
                  {PRESET_AMOUNTS.slice(0, 4).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectPreset(val)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        amount === val
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                          : 'bg-white/5 text-pink-200/80 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {formatPrice(val)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PRESET_AMOUNTS.slice(4).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectPreset(val)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        amount === val
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                          : 'bg-white/5 text-pink-200/80 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {formatPrice(val)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    id={customAmountInputId}
                    type="text"
                    value={customAmountStr}
                    onChange={handleCustomAmountChange}
                    placeholder="Nhập số tiền khác..."
                    className="w-full h-11 pl-4 pr-12 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:border-rose-500 outline-none transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-pink-300/50 font-bold">
                    VNĐ
                  </span>
                </div>
                {amount < (paymentConfig?.minDepositAmount || 10000) && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Số tiền nạp tối thiểu là {formatPrice(paymentConfig?.minDepositAmount || 10000)}
                  </p>
                )}
              </div>

              {/* Transfer Details (Quick Copy) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-pink-300/60">Chủ tài khoản:</span>
                  <span className="font-bold text-white uppercase">{selectedBank?.accountHolder}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-pink-300/60">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-rose-400 text-sm">{selectedBank?.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedBank?.accountNumber || '', 'Số tài khoản')}
                      className="p-1 rounded bg-white/5 hover:bg-rose-600/20 text-pink-200"
                      title="Sao chép"
                    >
                      {copiedField === 'Số tài khoản' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-pink-300/60">Nội dung chuyển khoản (bắt buộc):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-amber-300 text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferContent, 'Nội dung chuyển tiền')}
                      className="p-1 rounded bg-white/5 hover:bg-rose-600/20 text-pink-200"
                      title="Sao chép"
                    >
                      {copiedField === 'Nội dung chuyển tiền' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: VIETQR DISPLAY (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-between p-5 rounded-3xl bg-gradient-to-b from-[#230922] to-[#120412] border border-rose-500/20 shadow-xl text-center">
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-pink-200 uppercase tracking-wider flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-rose-400" />
                    Quét Mã VietQR
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Chờ chuyển tiền...
                  </div>
                </div>

                {/* QR Container */}
                <div className="relative p-3 bg-white rounded-2xl shadow-xl mx-auto inline-block border-2 border-rose-500/30">
                  {qrUrl ? (
                    <Image
                      src={qrUrl}
                      alt="VietQR SePay"
                      width={220}
                      height={220}
                      className="rounded-lg object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-zinc-100 flex items-center justify-center text-zinc-400">
                      Đang tải QR...
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <span className="text-xs text-pink-300/70 block">Số tiền thanh toán:</span>
                  <span className="text-lg font-black text-rose-400">{formatPrice(amount)}</span>
                </div>
              </div>

              {/* Check Balance Button Footer */}
              <div className="w-full pt-3 mt-2 border-t border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={handleCheckBalance}
                  disabled={checkingBalance}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${checkingBalance ? 'animate-spin' : ''}`} />
                  <span>{checkingBalance ? 'Đang kiểm tra...' : 'Kiểm Tra Số Dư Đã Nạp'}</span>
                </button>
                <Link
                  href="/deposit"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold transition w-full"
                >
                  Xem trang nạp chi tiết & lịch sử
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-pink-300/60 px-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Chuyển tiền đúng nội dung <strong>{transferContent}</strong> để được cộng tự động</span>
          </div>
          <span className="text-pink-300/40">Hotline hỗ trợ: {paymentConfig?.hotline || '1900 8888'}</span>
        </div>
      </div>
    </Modal>
  );
}

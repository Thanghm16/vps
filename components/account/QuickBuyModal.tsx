'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GameAccount } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import { Modal, App } from 'antd';
import {
  Zap,
  AlertCircle,
  Wallet,
  QrCode,
  LogIn,
  Loader2,
  TicketPercent,
  CheckCircle2,
  X,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import AccountDeliveryModal, { PurchasedOrderData } from './AccountDeliveryModal';

interface QuickBuyModalProps {
  account: GameAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onPurchaseSuccess?: (accountCode: string) => void;
}

export default function QuickBuyModal({
  account,
  isOpen,
  onClose,
  onOpenDeposit,
  onPurchaseSuccess,
}: QuickBuyModalProps) {
  const { message } = App.useApp();
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'qr'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryData, setDeliveryData] = useState<PurchasedOrderData | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  // Coupon states
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    description?: string;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Reset coupon state when modal opens or account changes
  useEffect(() => {
    if (isOpen) {
      setCouponInput('');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    }
  }, [isOpen, account?.code]);

  if (!account) return null;

  const currentBalance = user?.balance || 0;
  const effectivePrice = Math.max(0, account.price - discountAmount);
  const isBalanceEnough = currentBalance >= effectivePrice;
  const shortfall = Math.max(0, effectivePrice - currentBalance);

  // Áp dụng mã giảm giá
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      message.warning('Vui lòng nhập mã giảm giá.');
      return;
    }

    try {
      setValidatingCoupon(true);
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim().toUpperCase(),
          accountCode: account.code,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.coupon) {
        setAppliedCoupon(data.coupon);
        setDiscountAmount(data.discountAmount || 0);
        message.success(data.message || 'Áp dụng mã giảm giá thành công!');
      } else {
        message.error(data.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi kiểm tra mã giảm giá.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Hủy mã giảm giá
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponInput('');
    message.info('Đã hủy áp dụng mã giảm giá.');
  };

  const handleConfirmOrder = async () => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để thực hiện mua nick.');
      return;
    }

    if (paymentMethod === 'qr') {
      onClose();
      if (onOpenDeposit) {
        onOpenDeposit();
      }
      return;
    }

    if (!isBalanceEnough) {
      message.error(`Số dư ví không đủ! Cần nạp thêm ${formatPrice(shortfall)}.`);
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch('/api/orders/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: account.code,
          paymentMethod: 'wallet',
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        message.success(data.message || 'Mua tài khoản thành công!');
        await refreshUser();
        onPurchaseSuccess?.(account.code);

        const orderInfo: PurchasedOrderData = {
          code: data.order?.code || 'DH-SUCCESS',
          accountCode: account.code,
          accountTitle: account.title,
          gameName: account.gameName,
          amount: data.order?.amount || effectivePrice,
          credentials: data.credentials || {},
        };

        setDeliveryData(orderInfo);
        onClose();
        setDeliveryModalOpen(true);
      } else {
        message.error(data.message || 'Không thể hoàn tất đơn hàng.');
      }
    } catch (err) {
      console.error('[Buy Account Error]:', err);
      message.error('Lỗi kết nối máy chủ khi xử lý giao dịch.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsProcessing(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        width={520}
        centered
        destroyOnClose
        title={
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-rose-500" />
            <span>Xác Nhận Mua Tài Khoản</span>
          </div>
        }
        styles={{
          body: {
            backgroundColor: '#190a18',
            borderRadius: '20px',
            padding: '12px 0 0 0',
          },
          header: {
            backgroundColor: '#190a18',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px',
          },
        }}
      >
        {!isAuthenticated ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <LogIn className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bạn Cần Đăng Nhập</h3>
              <p className="text-xs text-pink-300/60 mt-1 max-w-xs">
                Đăng nhập tài khoản để sử dụng ví số dư và lưu giữ nick trong hồ sơ cá nhân của bạn.
              </p>
            </div>
            <div className="pt-2 flex gap-3">
              <Link
                href="/login"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 !text-white font-bold text-xs shadow-lg shadow-rose-900/40 flex items-center gap-2"
                style={{ color: '#ffffff' }}
              >
                <LogIn className="w-4 h-4 !text-white" />
                <span className="!text-white font-bold">Đăng Nhập Ngay</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 pt-2">
            {/* Account Summary & Price Breakdown */}
            <div className="p-3.5 rounded-2xl bg-[#240e22] border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {account.title}
                  </div>
                  <div className="text-[11px] text-pink-300/60 font-mono mt-0.5">
                    Mã: {account.code} • {account.gameName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-pink-300/60">
                    Giá gốc
                  </div>
                  <div className={`text-sm font-extrabold ${appliedCoupon ? 'line-through text-zinc-500' : 'text-rose-400'}`}>
                    {formatPrice(account.price)}
                  </div>
                </div>
              </div>

              {/* Chi tiết giảm giá nếu có mã */}
              {appliedCoupon && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Mã {appliedCoupon.code}</span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    - {formatPrice(discountAmount)}
                  </div>
                </div>
              )}

              {/* Tổng thanh toán */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Tổng thanh toán:</span>
                <span className="text-base font-black text-rose-400">
                  {formatPrice(effectivePrice)}
                </span>
              </div>
            </div>

            {/* Ô nhập Mã Giảm Giá (Coupon) */}
            <div className="p-3 rounded-2xl bg-[#1e0a1b] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-200">
                  <TicketPercent className="w-4 h-4 text-amber-400" />
                  <span>Mã Giảm Giá / Voucher</span>
                </div>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    <span>Hủy mã</span>
                  </button>
                )}
              </div>

              {appliedCoupon ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-300 text-xs">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-[10px] text-emerald-400/80">
                      (Đã giảm {formatPrice(discountAmount)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase().trim())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder="Nhập mã voucher (VD: SALE20)"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs transition disabled:opacity-40 flex items-center gap-1 shadow-md shadow-rose-950/40"
                  >
                    {validatingCoupon ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Áp Dụng</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-pink-200/80">Phương thức thanh toán:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    paymentMethod === 'wallet'
                      ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg shadow-rose-950/30'
                      : 'bg-[#1e0a1b] border-white/5 text-pink-200/60 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Wallet className="w-4 h-4 text-rose-400" />
                      <span>Ví Số Dư</span>
                    </div>
                    {isBalanceEnough ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        Đủ tiền
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                        Thiếu tiền
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Khả dụng: {formatPrice(currentBalance)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    paymentMethod === 'qr'
                      ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg shadow-rose-950/30'
                      : 'bg-[#1e0a1b] border-white/5 text-pink-200/60 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <QrCode className="w-4 h-4 text-purple-400" />
                    <span>Nạp Tiền / QR</span>
                  </div>
                  <span className="text-[10px] text-pink-300/60">Quét mã VietQR 24/7</span>
                </button>
              </div>
            </div>

            {/* Warning if Wallet Balance is not enough */}
            {paymentMethod === 'wallet' && !isBalanceEnough && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">
                    Thiếu <strong>{formatPrice(shortfall)}</strong> để mua nick này.
                  </span>
                </div>
                {onOpenDeposit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeposit();
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shrink-0 transition"
                  >
                    Nạp Thêm
                  </button>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="w-1/3 py-2.5 rounded-full bg-[#2a0e26] border border-white/10 text-xs font-bold text-pink-200 hover:bg-[#381433] transition cursor-pointer"
              >
                Hủy Bỏ
              </button>

              {paymentMethod === 'qr' ? (
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className="w-2/3 py-2.5 rounded-full btn-gradient-hero text-xs font-bold !text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  <QrCode className="w-4 h-4 !text-white" />
                  <span className="!text-white font-bold">Đi Tới Nạp Tiền VietQR</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isProcessing || !isBalanceEnough}
                  className="w-2/3 py-2.5 rounded-full btn-gradient-hero text-xs font-bold !text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#ffffff' }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin !text-white" />
                      <span className="!text-white font-bold">Đang xử lý đơn hàng...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 !text-white" />
                      <span className="!text-white font-bold">
                        Xác Nhận Mua ({formatPrice(effectivePrice)})
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Account Delivery Modal */}
      <AccountDeliveryModal
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        orderData={deliveryData}
      />
    </>
  );
}

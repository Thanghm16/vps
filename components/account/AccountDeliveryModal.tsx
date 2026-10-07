'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Modal,
  message,
} from 'antd';
import {
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  ShieldCheck,
  ExternalLink,
  User,
  KeyRound,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface DeliveryCredentialsData {
  username?: string;
  password?: string;
  twoFactorCode?: string;
  emailBound?: string;
  phoneBound?: string;
  note?: string;
}

export interface PurchasedOrderData {
  code: string;
  accountCode: string;
  accountTitle: string;
  gameName: string;
  amount: number;
  credentials: DeliveryCredentialsData;
}

interface AccountDeliveryModalProps {
  open: boolean;
  onClose: () => void;
  orderData: PurchasedOrderData | null;
}

export default function AccountDeliveryModal({
  open,
  onClose,
  orderData,
}: AccountDeliveryModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!orderData) return null;

  const { credentials } = orderData;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    message.success(`Đã sao chép ${fieldName}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadTxt = () => {
    const fileContent = `=====================================================
GAMESTORE VN - THÔNG TIN TÀI KHOẢN GAME BÀN GIAO
=====================================================
Mã Đơn Hàng: ${orderData.code}
Mã Tài Khoản: ${orderData.accountCode}
Tựa Game: ${orderData.gameName}
Tiêu Đề: ${orderData.accountTitle}
Giá Mua: ${formatPrice(orderData.amount)}
Thời Gian Bàn Giao: ${new Date().toLocaleString('vi-VN')}
-----------------------------------------------------
THÔNG TIN ĐĂNG NHẬP:
- Tài Khoản (Username): ${credentials.username || 'Không có'}
- Mật Khẩu (Password): ${credentials.password || 'Không có'}
${credentials.twoFactorCode ? `- Mã 2FA / Backup Code: ${credentials.twoFactorCode}\n` : ''}${credentials.emailBound ? `- Email Liên Kết: ${credentials.emailBound}\n` : ''}${credentials.phoneBound ? `- Số Điện Thoại: ${credentials.phoneBound}\n` : ''}${credentials.note ? `- Ghi Chú / Hướng Dẫn: ${credentials.note}\n` : ''}-----------------------------------------------------
LƯU Ý BẢO MẬT:
1. Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận nick.
2. Cập nhật email và số điện thoại bảo mật của chính bạn.
3. Không chia sẻ tài khoản / mật khẩu cho bất kỳ ai khác.
=====================================================`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thong-tin-nick-${orderData.accountCode.replace(/[^a-zA-Z0-9_-]/g, '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Đã tải file thông tin tài khoản (.txt) về máy!');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      destroyOnClose
      style={{ padding: 0 }}
      styles={{
        body: {
          padding: 0,
        },
      }}
      className="delivery-modal-dark"
    >
      <div className="flex flex-col">
        {/* HEADER BANNER */}
        <div className="p-6 bg-gradient-to-b from-[#2d0f28] to-[#1a0818] border-b border-white/10 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block mb-2">
            Bàn Giao Tự Động Thành Công
          </span>

          <h3 className="text-xl font-black text-white tracking-tight">
            Chúc Mừng Bạn Đã Sở Hữu Nick!
          </h3>
          <p className="text-xs text-pink-300/70 mt-1">
            Đơn hàng <strong>{orderData.code}</strong> • {orderData.accountCode} ({orderData.gameName})
          </p>
        </div>

        {/* CREDENTIALS BOX */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-rose-400" />
                Thông Tin Đăng Nhập Tài Khoản
              </span>
              <span className="text-[10px] text-pink-300/60 font-mono">Bảo mật cấp cao</span>
            </div>

            {/* USERNAME */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-pink-300/60 shrink-0" />
                <span className="text-xs text-pink-200/60">Tài khoản:</span>
                <span className="font-mono text-xs font-bold text-white truncate select-all">
                  {credentials.username || 'Đang cập nhật'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(credentials.username || '', 'Tài khoản')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600/30 text-pink-200 hover:text-white transition shrink-0 cursor-pointer"
                title="Sao chép tài khoản"
              >
                {copiedField === 'Tài khoản' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* PASSWORD */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <KeyRound className="w-4 h-4 text-pink-300/60 shrink-0" />
                <span className="text-xs text-pink-200/60">Mật khẩu:</span>
                <span className="font-mono text-xs font-black text-rose-300 truncate select-all">
                  {showPassword
                    ? credentials.password || '••••••••'
                    : '••••••••••••'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-pink-200 transition cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.password || '', 'Mật khẩu')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600/30 text-pink-200 hover:text-white transition cursor-pointer"
                  title="Sao chép mật khẩu"
                >
                  {copiedField === 'Mật khẩu' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 2FA / EMAIL / EXTRA NOTES */}
            {credentials.twoFactorCode && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-pink-200/60">Mã 2FA/Backup:</span>
                  <span className="font-mono text-xs font-bold text-amber-300 truncate select-all">
                    {credentials.twoFactorCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.twoFactorCode || '', 'Mã 2FA')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600/30 text-pink-200 hover:text-white transition shrink-0 cursor-pointer"
                >
                  {copiedField === 'Mã 2FA' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {credentials.emailBound && (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-pink-300/80">
                <span className="text-pink-300/50">Email liên kết: </span>
                <span className="text-white font-mono font-bold">{credentials.emailBound}</span>
              </div>
            )}

            {credentials.note && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold block mb-0.5">📌 Lưu ý bàn giao:</span>
                <span>{credentials.note}</span>
              </div>
            )}
          </div>

          {/* SECURITY ADVISORY */}
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Tài khoản đã được lưu vĩnh viễn trong mục <strong>Kho Nick Đã Mua</strong> tại Trang Cá Nhân của bạn. Vui lòng đổi mật khẩu ngay sau khi nhận nick!
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-pink-300" />
              <span>Tải File Thông Tin (.txt)</span>
            </button>

            <Link
              href="/profile?tab=orders"
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 !text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 text-center"
              style={{ color: '#ffffff' }}
            >
              <FileText className="w-4 h-4 !text-white" />
              <span className="!text-white font-bold">Xem Kho Nick Đã Mua</span>
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}

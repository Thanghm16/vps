'use client';

import React from 'react';
import Image from 'next/image';
import { AdminOrder } from '@/types/admin';
import { formatPrice } from '@/lib/utils';
import StatusBadge from '@/components/admin/common/StatusBadge';
import {
  X,
  User,
  Gamepad2,
  KeyRound,
  CreditCard,
  Copy,
} from 'lucide-react';
import { Drawer, App } from 'antd';

interface OrderDetailDrawerProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, newStatus: AdminOrder['status']) => void;
}

export default function OrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
}: OrderDetailDrawerProps) {
  const { message } = App.useApp();

  if (!order) return null;

  const handleCopy = (text: string, label: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      message.success(`Đã sao chép ${label}!`);
    }
  };

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      placement="right"
      size={540}
      closeIcon={<X className="w-5 h-5 text-pink-300 hover:text-white" />}
      styles={{
        body: {
          background: '#140613',
          padding: '1.5rem',
          color: '#fdf2f8',
        },
        header: {
          background: '#190a18',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      }}
      title={
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-mono font-bold text-sm">
              Chi Tiết Đơn Hàng {order.code}
            </span>
          </div>
          <StatusBadge status={order.status} size="sm" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* SECTION 1: CUSTOMER INFO */}
        <div className="p-4 rounded-2xl bg-[#1c081b]/70 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">
            <User className="w-4 h-4 text-rose-400" />
            <span>Thông Tin Khách Hàng</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-pink-300/50 block">Họ và tên:</span>
              <span className="font-bold text-white mt-0.5 block">
                {order.customerName}
              </span>
            </div>
            <div>
              <span className="text-pink-300/50 block">Số điện thoại:</span>
              <span className="font-mono font-bold text-white mt-0.5 block">
                {order.customerPhone}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-pink-300/50 block">Email nhận bàn giao:</span>
              <span className="font-medium text-pink-200 mt-0.5 block">
                {order.customerEmail}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: PURCHASED ACCOUNT INFO */}
        <div className="p-4 rounded-2xl bg-[#1c081b]/70 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span>Tài Khoản Đã Mua</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
              <Image
                src={order.accountThumbnail}
                alt={order.accountCode}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">
                  {order.accountCode}
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {order.gameName}
                </span>
              </div>
              <div className="text-sm font-black text-rose-400 mt-1">
                {formatPrice(order.amount)}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DELIVERY CREDENTIALS (IF DELIVERED OR PROCESSING) */}
        {order.deliveryCredentials && (
          <div className="p-4 rounded-2xl bg-[#220c21]/90 border border-rose-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-rose-400" />
                <span>Thông Tin Đăng Nhập Đã Bàn Giao</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400">
                100% Thông Tin Trắng
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div>
                  <span className="text-pink-300/60 text-[10px] block">Tài khoản (Username):</span>
                  <span className="font-mono font-bold text-white">
                    {order.deliveryCredentials.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(order.deliveryCredentials!.username, 'Tên tài khoản')
                  }
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div>
                  <span className="text-pink-300/60 text-[10px] block">Mật khẩu (Password):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {order.deliveryCredentials.password}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(order.deliveryCredentials!.password, 'Mật khẩu')
                  }
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-pink-200/80 leading-relaxed">
                <strong>Ghi chú:</strong> {order.deliveryCredentials.note}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: PAYMENT DETAILS & TIMELINE */}
        <div className="p-4 rounded-2xl bg-[#1c081b]/70 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span>Thanh Toán & Thời Gian</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-pink-300/50 block">Phương thức:</span>
              <span className="uppercase font-bold text-white mt-0.5 block">
                {order.paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-pink-300/50 block">Mã giao dịch:</span>
              <span className="font-mono text-white mt-0.5 block">
                {order.paymentCode || 'VÍ TÀI KHOẢN'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-pink-300/50 block">Thời gian tạo đơn:</span>
              <span className="font-medium text-pink-200 mt-0.5 block">
                {order.createdAt}
              </span>
            </div>
          </div>
        </div>

        {/* STATUS ACTIONS */}
        <div className="pt-2 flex flex-col gap-2">
          <span className="text-xs font-bold text-pink-300/60 uppercase tracking-wider">
            Cập Nhật Trạng Thái Đơn:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onUpdateStatus?.(order.id, 'delivered');
                message.success('Đã cập nhật đơn sang: Đã giao nick!');
              }}
              className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
            >
              ✓ Đã Bàn Giao Nick
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateStatus?.(order.id, 'cancelled');
                message.info('Đã cập nhật đơn sang: Đã hủy');
              }}
              className="py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
            >
              ✕ Hủy Đơn Hàng
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

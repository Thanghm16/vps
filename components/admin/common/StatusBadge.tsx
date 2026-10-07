'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Ban,
  Package,
} from 'lucide-react';

export type StatusType =
  | 'delivered'
  | 'paid'
  | 'processing'
  | 'pending'
  | 'cancelled'
  | 'success'
  | 'failed'
  | 'active'
  | 'inactive'
  | 'locked'
  | 'available'
  | 'sold'
  | 'reserved'
  | 'hidden'
  | 'expired';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const configMap: Record<
    string,
    {
      bg: string;
      text: string;
      border: string;
      icon: React.ElementType;
      defaultLabel: string;
    }
  > = {
    // Orders / Transactions
    delivered: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Đã giao',
    },
    paid: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Đã thanh toán',
    },
    processing: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Clock,
      defaultLabel: 'Đang xử lý',
    },
    pending: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      icon: Clock,
      defaultLabel: 'Chờ duyệt',
    },
    cancelled: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: XCircle,
      defaultLabel: 'Đã hủy',
    },
    success: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Thành công',
    },
    failed: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: XCircle,
      defaultLabel: 'Thất bại',
    },

    // Accounts
    available: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: Package,
      defaultLabel: 'Đang bán',
    },
    sold: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Đã bán',
    },
    reserved: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      icon: Clock,
      defaultLabel: 'Đang giữ',
    },
    hidden: {
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/30',
      icon: AlertCircle,
      defaultLabel: 'Tạm ẩn',
    },

    // Generic Active / Locked / Expired
    active: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: ShieldCheck,
      defaultLabel: 'Hoạt động',
    },
    inactive: {
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/30',
      icon: Ban,
      defaultLabel: 'Tạm tắt',
    },
    locked: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: Ban,
      defaultLabel: 'Bị khóa',
    },
    expired: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Clock,
      defaultLabel: 'Hết hạn',
    },
  };

  const item = configMap[status] || {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    icon: Clock,
    defaultLabel: status,
  };

  const Icon = item.icon;
  const displayText = label || item.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${item.bg} ${item.text} ${item.border} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{displayText}</span>
    </span>
  );
}

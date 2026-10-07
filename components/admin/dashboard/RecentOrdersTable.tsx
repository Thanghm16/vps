'use client';

import React from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { AdminOrder } from '@/types/admin';
import StatusBadge from '@/components/admin/common/StatusBadge';
import { ShoppingBag, ArrowRight, Eye } from 'lucide-react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface RecentOrdersTableProps {
  orders?: AdminOrder[];
  isLoading?: boolean;
  onViewOrder?: (order: AdminOrder) => void;
}

export default function RecentOrdersTable({
  orders = [],
  isLoading = false,
  onViewOrder,
}: RecentOrdersTableProps) {
  const columns: ColumnsType<AdminOrder> = [
    {
      title: 'MÃ ĐƠN',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <span className="font-mono font-bold text-rose-400 text-xs">{code}</span>
      ),
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record) => (
        <div>
          <div className="font-bold text-white text-xs">{name}</div>
          <div className="text-[11px] text-pink-300/50">{record.customerPhone}</div>
        </div>
      ),
    },
    {
      title: 'NICK & GAME',
      dataIndex: 'accountCode',
      key: 'accountCode',
      render: (accCode: string, record) => (
        <div>
          <span className="font-mono font-bold text-white text-xs">{accCode}</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-white/5 text-pink-200 border border-white/5">
            {record.gameName}
          </span>
        </div>
      ),
    },
    {
      title: 'GIÁ TRỊ',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-bold text-white text-xs">{formatPrice(amount)}</span>
      ),
    },
    {
      title: 'THANH TOÁN',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <span className="uppercase text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 text-pink-200 border border-white/5">
          {method}
        </span>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} size="sm" />,
    },
    {
      title: 'THỜI GIAN',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => (
        <span className="text-[11px] text-pink-300/60 whitespace-nowrap">{time}</span>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      render: (_, record) => (
        <button
          type="button"
          onClick={() => onViewOrder?.(record)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white transition cursor-pointer"
          title="Xem chi tiết đơn"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Đơn Hàng Gần Đây
            </h3>
            <p className="text-xs text-pink-200/60 mt-0.5">
              Các đơn mua nick phát sinh trong phiên làm việc
            </p>
          </div>
        </div>

        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-rose-600/20 text-xs font-bold text-pink-200 hover:text-white border border-white/10 hover:border-rose-500/30 transition"
        >
          <span>Xem tất cả đơn</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={orders}
          loading={isLoading}
          rowKey="id"
          pagination={false}
          className="custom-admin-table"
        />
      </div>
    </div>
  );
}

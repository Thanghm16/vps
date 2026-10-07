'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
  BarChart3,
  Users,
  Coins,
  Gift,
  Award,
  RotateCw,
  ArrowLeft,
  Calendar,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Select, App, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface StatisticsData {
  totalSpins: number;
  totalParticipants: number;
  totalRevenue: number;
  totalPrizesAwarded: number;
  totalPrizeValue: number;
  rewardsBreakdown: Array<{
    name: string;
    type: string;
    count: number;
    totalValue: number;
  }>;
  dailyTrends: Array<{
    date: string;
    spins: number;
    revenue: number;
    prizes: number;
  }>;
}

export default function AdminLuckyWheelStatisticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { message } = App.useApp();

  const [range, setRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [wheelInfo, setWheelInfo] = useState<any | null>(null);
  const [rewardsStock, setRewardsStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lucky-wheel/${id}/statistics?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setWheelInfo(data.wheel);
        setRewardsStock(data.rewardsStock || []);
      } else {
        message.error(data.message || 'Lỗi nạp thống kê');
      }
    } catch {
      message.error('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  }, [id, range, message]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const breakdownColumns: ColumnsType<any> = [
    {
      title: 'Tên Phần Thưởng',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-bold text-white text-xs">{name}</span>,
    },
    {
      title: 'Phân Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="purple" className="text-[10px] font-bold uppercase">
          {type}
        </Tag>
      ),
    },
    {
      title: 'Số Lần Trúng',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => (
        <span className="font-mono font-bold text-rose-400 text-xs">
          {count.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Tổng Giá Trị Trao',
      dataIndex: 'totalValue',
      key: 'totalValue',
      render: (val: number) => (
        <span className="font-mono font-bold text-emerald-400 text-xs">
          {val > 0 ? `${val.toLocaleString('vi-VN')} ₫` : '-'}
        </span>
      ),
    },
  ];

  const stockColumns: ColumnsType<any> = [
    {
      title: 'Phần Thưởng',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-bold text-white text-xs">{name}</span>,
    },
    {
      title: 'Xác Suất (%)',
      dataIndex: 'probability',
      key: 'probability',
      render: (prob: number) => <span className="font-bold text-rose-400 text-xs">{prob}%</span>,
    },
    {
      title: 'Số Lượng Ban Đầu',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => (
        <span className="text-pink-200 text-xs">{qty === -1 ? 'Vô hạn' : qty.toLocaleString('vi-VN')}</span>
      ),
    },
    {
      title: 'Còn Lại Trong Kho',
      dataIndex: 'remainingQuantity',
      key: 'remainingQuantity',
      render: (rem: number, record) => (
        <span
          className={`font-bold text-xs ${
            record.quantity !== -1 && rem <= 5 ? 'text-amber-400' : 'text-emerald-400'
          }`}
        >
          {record.quantity === -1 ? 'Vô hạn' : rem.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'} className="text-[10px] font-bold">
          {enabled ? 'BẬT' : 'TẮT'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title={`Thống Kê Vòng Quay: ${wheelInfo?.name || ''}`}
        description="Tổng quan số liệu tham gia, doanh thu từ lượt quay và phân bố giải thưởng qua aggregation pipeline."
        action={
          <div className="flex items-center gap-3">
            <Select
              value={range}
              onChange={setRange}
              className="w-36"
              options={[
                { value: 'today', label: 'Hôm nay' },
                { value: '7days', label: '7 ngày qua' },
                { value: '30days', label: '30 ngày qua' },
                { value: 'all', label: 'Toàn thời gian' },
              ]}
            />
            <Link
              href="/admin/lucky-wheel"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </Link>
          </div>
        }
      />

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl bg-[#180718] border border-white/8 space-y-2">
          <div className="flex items-center justify-between text-pink-300/60">
            <span className="text-xs font-semibold">Tổng Lượt Quay</span>
            <RotateCw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats?.totalSpins?.toLocaleString('vi-VN') || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#180718] border border-white/8 space-y-2">
          <div className="flex items-center justify-between text-pink-300/60">
            <span className="text-xs font-semibold">Người Tham Gia</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats?.totalParticipants?.toLocaleString('vi-VN') || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#180718] border border-white/8 space-y-2">
          <div className="flex items-center justify-between text-pink-300/60">
            <span className="text-xs font-semibold">Doanh Thu Thu Được</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {(stats?.totalRevenue || 0).toLocaleString('vi-VN')} ₫
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#180718] border border-white/8 space-y-2">
          <div className="flex items-center justify-between text-pink-300/60">
            <span className="text-xs font-semibold">Phần Thưởng Đã Trao</span>
            <Gift className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats?.totalPrizesAwarded?.toLocaleString('vi-VN') || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#180718] border border-white/8 space-y-2">
          <div className="flex items-center justify-between text-pink-300/60">
            <span className="text-xs font-semibold">Tổng Giá Trị Quà</span>
            <Award className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-pink-400 font-mono">
            {(stats?.totalPrizeValue || 0).toLocaleString('vi-VN')} ₫
          </div>
        </div>
      </div>

      {/* TABLES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PHÂN BỐ PHẦN THƯỞNG ĐÃ PHÁT */}
        <div className="rounded-3xl bg-[#180718] border border-white/8 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Phần Thưởng Đã Phát Theo Lượt Quay</h3>
          </div>

          <Table
            columns={breakdownColumns}
            dataSource={stats?.rewardsBreakdown || []}
            rowKey="name"
            pagination={false}
            loading={loading}
            className="admin-custom-table"
          />
        </div>

        {/* TỒN KHO PHẦN THƯỞNG */}
        <div className="rounded-3xl bg-[#180718] border border-white/8 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Tồn Kho & Tỷ Lệ Xác Suất Hiện Tại</h3>
          </div>

          <Table
            columns={stockColumns}
            dataSource={rewardsStock}
            rowKey="id"
            pagination={false}
            loading={loading}
            className="admin-custom-table"
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
  History,
  Search,
  RotateCw,
  Coins,
  Gamepad2,
  TicketPercent,
  Gift,
  Frown,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Table, Input, Select, Tag, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RewardType } from '@/types/lucky-wheel';

interface SpinRecord {
  id: string;
  username: string;
  customerName?: string;
  rewardId: string;
  rewardName: string;
  rewardType: RewardType;
  rewardValue: number;
  rewardImage?: string;
  spinNumber: number;
  cost: number;
  costType: 'free' | 'bonus' | 'wallet';
  status: string;
  claimStatus: string;
  claimDetails?: Record<string, any>;
  ip?: string;
  createdAt: string;
}

export default function AdminLuckyWheelHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { message } = App.useApp();

  const [spins, setSpins] = useState<SpinRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [wheelName, setWheelName] = useState('');

  const [searchUsername, setSearchUsername] = useState('');
  const [rewardTypeFilter, setRewardTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchSpins = useCallback(async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        username: searchUsername,
        rewardType: rewardTypeFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/lucky-wheel/${id}/history?${qParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSpins(data.spins || []);
        setTotalCount(data.total || 0);
        if (data.wheelName) setWheelName(data.wheelName);
      } else {
        message.error(data.message || 'Lỗi nạp lịch sử quay');
      }
    } catch {
      message.error('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  }, [id, page, pageSize, searchUsername, rewardTypeFilter, statusFilter, message]);

  useEffect(() => {
    fetchSpins();
  }, [fetchSpins]);

  const columns: ColumnsType<SpinRecord> = [
    {
      title: 'Lượt',
      key: 'spinNumber',
      width: 80,
      render: (_, record) => <span className="font-mono text-pink-300 font-bold">#{record.spinNumber}</span>,
    },
    {
      title: 'Người Dùng',
      key: 'username',
      render: (_, record) => (
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-white block">{record.username}</span>
          {record.ip && (
            <span className="text-[10px] font-mono text-pink-300/40 block">IP: {record.ip}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Phần Thưởng',
      key: 'reward',
      render: (_, record) => {
        let tagColor = 'default';
        if (record.rewardType === 'ACCOUNT') tagColor = 'rose';
        else if (record.rewardType === 'COUPON') tagColor = 'purple';
        else if (record.rewardType === 'MONEY') tagColor = 'gold';
        else if (record.rewardType === 'EXTRA_SPIN') tagColor = 'blue';

        return (
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">{record.rewardName}</span>
            <Tag color={tagColor} className="text-[9px] font-bold uppercase">
              {record.rewardType}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Chi Phí',
      key: 'cost',
      width: 120,
      render: (_, record) => (
        <div className="space-y-0.5">
          <span className="text-xs font-bold font-mono text-amber-400 block">
            {record.cost > 0 ? `${record.cost.toLocaleString('vi-VN')} ₫` : '0 ₫'}
          </span>
          <span className="text-[10px] text-pink-300/50 uppercase block">
            {record.costType === 'free' ? 'Lượt Free' : record.costType === 'bonus' ? 'Lượt Thưởng' : 'Số dư ví'}
          </span>
        </div>
      ),
    },
    {
      title: 'Trao Thưởng',
      key: 'claimStatus',
      width: 150,
      render: (_, record) => {
        if (record.claimStatus === 'CLAIMED') {
          return (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã cấp quà
              </span>
              {record.claimDetails?.orderCode && (
                <span className="text-[10px] font-mono text-pink-300/50 block">
                  Đơn: #{record.claimDetails.orderCode}
                </span>
              )}
              {record.claimDetails?.couponCode && (
                <span className="text-[10px] font-mono text-purple-300 block">
                  Mã: {record.claimDetails.couponCode}
                </span>
              )}
            </div>
          );
        } else if (record.claimStatus === 'FAILED') {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
              <XCircle className="w-3.5 h-3.5" /> Lỗi cấp quà
            </span>
          );
        }
        return <span className="text-[11px] text-zinc-500">-</span>;
      },
    },
    {
      title: 'Thời Gian',
      key: 'createdAt',
      width: 160,
      render: (_, record) => (
        <div className="text-[11px] text-pink-300/60 flex items-center gap-1">
          <Clock className="w-3 h-3 text-pink-300/40" />
          <span>{new Date(record.createdAt).toLocaleString('vi-VN')}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title={`Lịch Sử Quay: ${wheelName || 'Vòng Quay'}`}
        description="Chi tiết từng lượt quay của người dùng, thời gian, chi phí và trạng thái cấp phần thưởng."
        action={
          <Link
            href="/admin/lucky-wheel"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
        }
      />

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#180718] border border-white/8">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Input
            prefix={<Search className="w-4 h-4 text-pink-300/40" />}
            placeholder="Tìm theo username người quay..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            allowClear
            className="rounded-xl bg-white/5 border-white/10 text-white max-w-xs"
          />

          <Select
            value={rewardTypeFilter}
            onChange={setRewardTypeFilter}
            className="w-44"
            options={[
              { value: 'all', label: 'Tất cả phần thưởng' },
              { value: 'ACCOUNT', label: 'Nick Game' },
              { value: 'COUPON', label: 'Coupon / Voucher' },
              { value: 'MONEY', label: 'Tiền mặt' },
              { value: 'EXTRA_SPIN', label: 'Thêm lượt quay' },
              { value: 'NOTHING', label: 'Không trúng' },
            ]}
          />
        </div>

        <button
          onClick={fetchSpins}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* TABLE */}
      <div className="rounded-3xl bg-[#180718] border border-white/8 overflow-hidden">
        <Table
          columns={columns}
          dataSource={spins}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total: totalCount,
            onChange: (p) => setPage(p),
            showTotal: (total) => `Tổng số ${total} lượt quay`,
          }}
          className="admin-custom-table"
        />
      </div>
    </div>
  );
}

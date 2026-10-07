'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
  Gift,
  PlusCircle,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  History,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Clock,
  Sparkles,
  Layers,
  Coins,
} from 'lucide-react';
import {
  Table,
  Modal,
  Input,
  Select,
  App,
  Popconfirm,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import WheelCanvas from '@/components/lucky-wheel/WheelCanvas';

interface WheelItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  status: 'draft' | 'active' | 'inactive' | 'expired';
  startAt: string | null;
  endAt: string | null;
  spinCost: number;
  freeSpinsPerUser: number;
  dailySpinLimit: number | null;
  maxSpinsPerUser: number | null;
  requireLogin: boolean;
  enabled: boolean;
  rewardsCount: number;
  enabledRewardsCount: number;
  totalProbability: number;
  isProbabilityValid: boolean;
  totalSpins: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminLuckyWheelPage() {
  const { message } = App.useApp();
  const router = useRouter();

  const [wheels, setWheels] = useState<WheelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // State cho Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewWheel, setPreviewWheel] = useState<any | null>(null);
  const [previewSpinning, setPreviewSpinning] = useState(false);
  const [previewTargetIdx, setPreviewTargetIdx] = useState<number | null>(null);
  const [previewWonReward, setPreviewWonReward] = useState<any | null>(null);

  const fetchWheels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status: statusFilter,
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/lucky-wheel?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setWheels(data.wheels || []);
        setTotalCount(data.total || 0);
      } else {
        message.error(data.message || 'Lỗi nạp danh sách vòng quay');
      }
    } catch {
      message.error('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchQuery, message]);

  useEffect(() => {
    fetchWheels();
  }, [fetchWheels]);

  // Xử lý bật/tắt nhanh trạng thái vòng quay
  const handleToggleStatus = async (record: WheelItem, checked: boolean) => {
    try {
      const res = await fetch(`/api/admin/lucky-wheel/${record.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: checked,
          status: checked ? 'active' : 'inactive',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        message.success(data.message || 'Cập nhật trạng thái thành công!');
        fetchWheels();
      } else {
        message.error(data.message || 'Cập nhật trạng thái thất bại');
      }
    } catch {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  // Xử lý nhân bản vòng quay
  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/lucky-wheel/${id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success(data.message || 'Nhân bản vòng quay thành công!');
        fetchWheels();
      } else {
        message.error(data.message || 'Lỗi nhân bản vòng quay');
      }
    } catch {
      message.error('Lỗi khi nhân bản');
    }
  };

  // Xử lý xóa vòng quay
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/lucky-wheel/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success(data.message || 'Đã xóa vòng quay thành công!');
        fetchWheels();
      } else {
        message.error(data.message || 'Lỗi xóa vòng quay');
      }
    } catch {
      message.error('Lỗi khi xóa vòng quay');
    }
  };

  // Mở modal xem trước
  const handleOpenPreview = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/lucky-wheel/${id}`);
      const data = await res.json();
      if (data.success && data.wheel) {
        setPreviewWheel(data.wheel);
        setPreviewWonReward(null);
        setPreviewModalOpen(true);
      } else {
        message.error('Không thể tải dữ liệu xem trước');
      }
    } catch {
      message.error('Lỗi khi tải bản xem trước');
    }
  };

  // Quay thử trong preview (không trừ tiền, không ghi DB)
  const handleTestSpin = () => {
    if (previewSpinning || !previewWheel?.rewards?.length) return;
    const enabledRewards = previewWheel.rewards.filter((r: any) => r.enabled);
    if (enabledRewards.length === 0) {
      message.warning('Vòng quay chưa có giải thưởng nào được bật!');
      return;
    }
    const randIdx = Math.floor(Math.random() * previewWheel.rewards.length);
    setPreviewTargetIdx(randIdx);
    setPreviewWonReward(previewWheel.rewards[randIdx]);
    setPreviewSpinning(true);
  };

  const columns: ColumnsType<WheelItem> = [
    {
      title: 'Vòng Quay',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600/30 to-purple-600/30 border border-rose-500/30 flex items-center justify-center shrink-0 overflow-hidden">
            {record.thumbnail ? (
              <Image src={record.thumbnail} alt={record.name} fill className="object-cover" />
            ) : (
              <Gift className="w-6 h-6 text-rose-400" />
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/lucky-wheel/${record.id}/edit`}
              className="text-xs font-bold text-white hover:text-rose-400 transition block truncate"
            >
              {record.name}
            </Link>
            <span className="text-[11px] font-mono text-pink-300/50 block">/{record.slug}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      width: 130,
      render: (_, record) => {
        let color = 'default';
        let label = 'Nháp';
        if (record.status === 'active') {
          color = 'success';
          label = 'Hoạt động';
        } else if (record.status === 'inactive') {
          color = 'warning';
          label = 'Tạm dừng';
        } else if (record.status === 'expired') {
          color = 'error';
          label = 'Hết hạn';
        }
        return (
          <div className="space-y-1">
            <Tag color={color} className="font-bold text-[10px] uppercase">
              {label}
            </Tag>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Switch
                size="small"
                checked={record.enabled && record.status === 'active'}
                onChange={(checked) => handleToggleStatus(record, checked)}
              />
              <span className="text-[10px] text-pink-300/60">
                {record.enabled && record.status === 'active' ? 'Bật' : 'Tắt'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giá / Lượt',
      key: 'spinCost',
      width: 120,
      render: (_, record) => (
        <span className="text-xs font-bold text-amber-400 font-mono">
          {record.spinCost > 0 ? `${record.spinCost.toLocaleString('vi-VN')} ₫` : 'Miễn phí'}
        </span>
      ),
    },
    {
      title: 'Số Giải / Xác Suất',
      key: 'rewards',
      width: 160,
      render: (_, record) => (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-white block">
            {record.enabledRewardsCount} / {record.rewardsCount} giải đang bật
          </span>
          <div className="flex items-center gap-1">
            {record.isProbabilityValid ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" /> 100%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-2.5 h-2.5" /> {record.totalProbability}% (Lỗi)
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Lượt Quay',
      key: 'totalSpins',
      width: 110,
      render: (_, record) => (
        <div className="flex items-center gap-1.5 text-xs font-bold text-pink-200">
          <RotateCw className="w-3.5 h-3.5 text-rose-400" />
          <span>{record.totalSpins.toLocaleString('vi-VN')}</span>
        </div>
      ),
    },
    {
      title: 'Thời Gian',
      key: 'time',
      width: 150,
      render: (_, record) => (
        <div className="text-[11px] text-pink-300/60 space-y-0.5">
          <div>Từ: {record.startAt ? new Date(record.startAt).toLocaleDateString('vi-VN') : 'Ngay lập tức'}</div>
          <div>Đến: {record.endAt ? new Date(record.endAt).toLocaleDateString('vi-VN') : 'Vô thời hạn'}</div>
        </div>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 180,
      align: 'right',
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1.5">
          <Tooltip title="Xem trước vòng quay">
            <button
              onClick={() => handleOpenPreview(record.id)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip title="Thống kê">
            <Link
              href={`/admin/lucky-wheel/${record.id}/statistics`}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 transition cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
            </Link>
          </Tooltip>

          <Tooltip title="Lịch sử quay">
            <Link
              href={`/admin/lucky-wheel/${record.id}/history`}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 transition cursor-pointer"
            >
              <History className="w-4 h-4" />
            </Link>
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <Link
              href={`/admin/lucky-wheel/${record.id}/edit`}
              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 transition cursor-pointer"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </Tooltip>

          <Tooltip title="Nhân bản">
            <Popconfirm
              title="Nhân bản vòng quay"
              description="Bạn có chắc muốn tạo bản sao của vòng quay này không?"
              onConfirm={() => handleDuplicate(record.id)}
              okText="Nhân bản"
              cancelText="Hủy"
            >
              <button className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition cursor-pointer">
                <Copy className="w-4 h-4" />
              </button>
            </Popconfirm>
          </Tooltip>

          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa vòng quay"
              description="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa không?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <button className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title="Quản Lý Vòng Quay May Mắn"
        description="Tạo và quản lý các sự kiện vòng quay may mắn, cấu hình phần thưởng, xác suất và tỷ lệ trúng thưởng."
        action={
          <Link
            href="/admin/lucky-wheel/create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Vòng Quay Mới</span>
          </Link>
        }
      />

      {/* FILTER ROW */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#180718] border border-white/8">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Input
            prefix={<Search className="w-4 h-4 text-pink-300/40" />}
            placeholder="Tìm kiếm theo tên, slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="rounded-xl bg-white/5 border-white/10 text-white"
          />

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-40"
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'draft', label: 'Bản nháp' },
              { value: 'inactive', label: 'Tạm dừng' },
              { value: 'expired', label: 'Đã kết thúc' },
            ]}
          />
        </div>

        <button
          onClick={fetchWheels}
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
          dataSource={wheels}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total: totalCount,
            onChange: (p) => setPage(p),
            showTotal: (total) => `Tổng số ${total} vòng quay`,
          }}
          className="admin-custom-table"
        />
      </div>

      {/* PREVIEW SIMULATION MODAL */}
      <Modal
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        footer={null}
        centered
        width={560}
        title={
          <div className="flex items-center gap-2 text-white text-base font-bold">
            <Eye className="w-4 h-4 text-rose-400" />
            <span>Xem Trước Vòng Quay: {previewWheel?.name}</span>
          </div>
        }
        styles={{
          body: {
            background: '#180718',
            borderRadius: '24px',
            padding: '16px',
          },
          header: {
            background: '#180718',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '12px',
          },
        }}
      >
        <div className="flex flex-col items-center py-4">
          <WheelCanvas
            rewards={previewWheel?.rewards || []}
            isSpinning={previewSpinning}
            targetIndex={previewTargetIdx}
            onSpinEnd={() => setPreviewSpinning(false)}
          />

          <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-xs">
            <button
              onClick={handleTestSpin}
              disabled={previewSpinning}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4" />
              <span>{previewSpinning ? 'Đang quay thử...' : 'Quay Thử Nghiệm'}</span>
            </button>
            <span className="text-[10px] text-pink-300/50">
              * Chế độ xem trước không ghi log, không trừ tiền và không cấp quà thật.
            </span>

            {previewWonReward && !previewSpinning && (
              <div className="mt-2 p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold text-center w-full animate-in fade-in">
                Kết quả dừng: {previewWonReward.name}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

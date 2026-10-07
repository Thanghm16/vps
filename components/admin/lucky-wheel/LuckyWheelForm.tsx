'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Gift,
  Save,
  ArrowLeft,
  PlusCircle,
  Edit,
  Trash2,
  MoveUp,
  MoveDown,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Coins,
  Gamepad2,
  TicketPercent,
  Frown,
  Upload,
  Eye,
  Sparkles,
  Info,
  Calendar,
  Settings,
} from 'lucide-react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  Tabs,
  Modal,
  Table,
  App,
  Popconfirm,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import WheelCanvas from '@/components/lucky-wheel/WheelCanvas';
import { LuckyWheelReward, RewardType, WheelStatus } from '@/types/lucky-wheel';

interface LuckyWheelFormProps {
  initialValues?: any;
  isEdit?: boolean;
  wheelId?: string;
}

const PRESET_COLORS = [
  '#e11d48', // Rose
  '#2563eb', // Blue
  '#d97706', // Amber
  '#059669', // Emerald
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#16a34a', // Green
  '#dc2626', // Red
  '#1e1b4b', // Dark Indigo
  '#312e81', // Deep Blue
];

export default function LuckyWheelForm({
  initialValues,
  isEdit = false,
  wheelId,
}: LuckyWheelFormProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [rewardForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [rewards, setRewards] = useState<LuckyWheelReward[]>(initialValues?.rewards || []);

  // Reward Modal State
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LuckyWheelReward | null>(null);
  const [selectedRewardType, setSelectedRewardType] = useState<RewardType>('NOTHING');

  // Preview State
  const [previewSpinning, setPreviewSpinning] = useState(false);
  const [previewTargetIdx, setPreviewTargetIdx] = useState<number | null>(null);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Cập nhật form khi có initialValues
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        slug: initialValues.slug,
        description: initialValues.description,
        thumbnail: initialValues.thumbnail,
        status: initialValues.status || 'draft',
        spinCost: initialValues.spinCost || 0,
        freeSpinsPerUser: initialValues.freeSpinsPerUser !== undefined ? initialValues.freeSpinsPerUser : 1,
        dailySpinLimit: initialValues.dailySpinLimit || null,
        maxSpinsPerUser: initialValues.maxSpinsPerUser || null,
        requireLogin: initialValues.requireLogin ?? true,
        enabled: initialValues.enabled ?? true,
        startAt: initialValues.startAt ? dayjs(initialValues.startAt) : null,
        endAt: initialValues.endAt ? dayjs(initialValues.endAt) : null,
        rules: initialValues.rules || '',
        seoTitle: initialValues.seoTitle || '',
        seoDescription: initialValues.seoDescription || '',
      });
      if (initialValues.rewards) {
        setRewards(initialValues.rewards);
      }
    }
  }, [initialValues, form]);

  // Tự động sinh slug khi nhập tên
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEdit) {
      const nameVal = e.target.value;
      const autoSlug = nameVal
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      form.setFieldsValue({ slug: autoSlug });
    }
  };

  // Tính tổng xác suất thời gian thực
  const totalProbability = useMemo(() => {
    const total = rewards
      .filter((r) => r.enabled)
      .reduce((sum, r) => sum + (Number(r.probability) || 0), 0);
    return Math.round(total * 100) / 100;
  }, [rewards]);

  const isProbabilityValid = Math.abs(totalProbability - 100) <= 0.05;

  // Xử lý upload ảnh Thumbnail hoặc Reward Image qua Cloudfly S3
  const handleUploadImage = async (file: File, target: 'thumbnail' | 'reward') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'lucky-wheel');

    setUploadingImage(true);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        message.success('Tải ảnh lên thành công!');
        if (target === 'thumbnail') {
          form.setFieldsValue({ thumbnail: data.url });
        } else {
          rewardForm.setFieldsValue({ image: data.url });
        }
      } else {
        message.error(data.message || 'Lỗi tải ảnh lên');
      }
    } catch {
      message.error('Không thể tải ảnh lên máy chủ');
    } finally {
      setUploadingImage(false);
    }
  };

  // Mở modal thêm/sửa reward
  const handleOpenRewardModal = (reward?: LuckyWheelReward) => {
    if (reward) {
      setEditingReward(reward);
      setSelectedRewardType(reward.type);
      rewardForm.setFieldsValue({
        name: reward.name,
        type: reward.type,
        description: reward.description,
        image: reward.image,
        color: reward.color || PRESET_COLORS[rewards.length % PRESET_COLORS.length],
        textColor: reward.textColor || '#ffffff',
        value: reward.value,
        quantity: reward.quantity,
        remainingQuantity: reward.remainingQuantity,
        probability: reward.probability,
        enabled: reward.enabled ?? true,
        couponDiscountPercent: reward.metadata?.couponDiscountPercent,
        couponMinOrder: reward.metadata?.couponMinOrder,
        couponMaxDiscount: reward.metadata?.couponMaxDiscount,
        gameSlug: reward.metadata?.gameSlug,
        accountId: reward.metadata?.accountId,
        productName: reward.metadata?.productName,
      });
    } else {
      setEditingReward(null);
      setSelectedRewardType('NOTHING');
      rewardForm.resetFields();
      rewardForm.setFieldsValue({
        type: 'NOTHING',
        color: PRESET_COLORS[rewards.length % PRESET_COLORS.length],
        textColor: '#ffffff',
        value: 0,
        quantity: -1,
        remainingQuantity: -1,
        probability: 0,
        enabled: true,
      });
    }
    setRewardModalOpen(true);
  };

  // Lưu phần thưởng trong Modal
  const handleSaveReward = async () => {
    try {
      const values = await rewardForm.validateFields();
      const metadata: any = {};

      if (values.type === 'COUPON') {
        if (values.couponDiscountPercent) metadata.couponDiscountPercent = Number(values.couponDiscountPercent);
        if (values.couponMinOrder) metadata.couponMinOrder = Number(values.couponMinOrder);
        if (values.couponMaxDiscount) metadata.couponMaxDiscount = Number(values.couponMaxDiscount);
      } else if (values.type === 'ACCOUNT') {
        if (values.gameSlug) metadata.gameSlug = values.gameSlug;
        if (values.accountId) metadata.accountId = values.accountId;
      } else if (values.type === 'PRODUCT') {
        if (values.productName) metadata.productName = values.productName;
      }

      const rewardData: LuckyWheelReward = {
        id: editingReward ? editingReward.id : `rew_${Date.now()}_${rewards.length}`,
        name: values.name.trim(),
        type: values.type,
        description: values.description?.trim() || '',
        image: values.image?.trim() || '',
        color: values.color || '#e11d48',
        textColor: values.textColor || '#ffffff',
        value: Number(values.value) || 0,
        quantity: values.quantity !== undefined ? Number(values.quantity) : -1,
        remainingQuantity:
          values.remainingQuantity !== undefined
            ? Number(values.remainingQuantity)
            : values.quantity !== undefined
            ? Number(values.quantity)
            : -1,
        probability: Number(values.probability) || 0,
        enabled: !!values.enabled,
        sortOrder: editingReward ? editingReward.sortOrder : rewards.length,
        metadata,
      };

      if (editingReward) {
        setRewards(rewards.map((r) => (r.id === editingReward.id ? rewardData : r)));
        message.success('Đã cập nhật phần thưởng');
      } else {
        setRewards([...rewards, rewardData]);
        message.success('Đã thêm phần thưởng mới');
      }

      setRewardModalOpen(false);
    } catch {
      // Form validation error
    }
  };

  // Xóa reward
  const handleDeleteReward = (id: string) => {
    setRewards(rewards.filter((r) => r.id !== id));
    message.success('Đã xóa phần thưởng khỏi danh sách');
  };

  // Di chuyển thứ tự reward
  const handleMoveReward = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === rewards.length - 1)) {
      return;
    }
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newRewards = [...rewards];
    const temp = newRewards[index];
    newRewards[index] = newRewards[targetIdx];
    newRewards[targetIdx] = temp;

    // Cập nhật lại sortOrder
    const updated = newRewards.map((r, idx) => ({ ...r, sortOrder: idx }));
    setRewards(updated);
  };

  // Bật/tắt reward
  const handleToggleRewardEnabled = (id: string, checked: boolean) => {
    setRewards(rewards.map((r) => (r.id === id ? { ...r, enabled: checked } : r)));
  };

  // Lưu toàn bộ Vòng Quay (Submit Form)
  const handleSubmit = async (values: any) => {
    if (rewards.length === 0) {
      message.error('Vòng quay phải có ít nhất 1 phần thưởng.');
      setActiveTab('rewards');
      return;
    }

    // Nếu kích hoạt vòng quay (status === 'active' & enabled === true), kiểm tra tổng xác suất
    const isActivating = values.status === 'active' && values.enabled;
    if (isActivating && !isProbabilityValid) {
      message.error(
        `Không thể lưu kích hoạt! Tổng xác suất các giải đang bật phải đúng 100.0% (Hiện tại: ${totalProbability}%).`
      );
      setActiveTab('rewards');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...values,
        startAt: values.startAt ? values.startAt.toISOString() : null,
        endAt: values.endAt ? values.endAt.toISOString() : null,
        rewards,
      };

      const url = isEdit ? `/api/admin/lucky-wheel/${wheelId}` : '/api/admin/lucky-wheel';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        message.success(data.message || (isEdit ? 'Cập nhật thành công!' : 'Tạo mới thành công!'));
        router.push('/admin/lucky-wheel');
      } else {
        message.error(data.message || 'Lỗi lưu thông tin vòng quay');
      }
    } catch {
      message.error('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const rewardColumns: ColumnsType<LuckyWheelReward> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => <span className="font-bold text-pink-300/70">#{index + 1}</span>,
    },
    {
      title: 'Màu sắc',
      key: 'color',
      width: 80,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg border border-white/20 shadow"
            style={{ backgroundColor: record.color || '#e11d48' }}
          />
        </div>
      ),
    },
    {
      title: 'Tên Phần Thưởng',
      key: 'name',
      render: (_, record) => (
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-white block">{record.name}</span>
          {record.description && (
            <span className="text-[10px] text-pink-300/50 block truncate max-w-xs">
              {record.description}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      width: 130,
      render: (_, record) => {
        let tagColor = 'default';
        let icon = <Gift className="w-3 h-3" />;
        if (record.type === 'ACCOUNT') {
          tagColor = 'rose';
          icon = <Gamepad2 className="w-3 h-3" />;
        } else if (record.type === 'COUPON') {
          tagColor = 'purple';
          icon = <TicketPercent className="w-3 h-3" />;
        } else if (record.type === 'MONEY') {
          tagColor = 'gold';
          icon = <Coins className="w-3 h-3" />;
        } else if (record.type === 'EXTRA_SPIN') {
          tagColor = 'blue';
          icon = <RotateCw className="w-3 h-3" />;
        }
        return (
          <Tag color={tagColor} className="text-[10px] font-bold uppercase inline-flex items-center gap-1">
            {icon}
            {record.type}
          </Tag>
        );
      },
    },
    {
      title: 'Giá Trị',
      key: 'value',
      width: 110,
      render: (_, record) => (
        <span className="text-xs font-mono font-bold text-emerald-400">
          {record.type === 'MONEY'
            ? `${record.value.toLocaleString('vi-VN')} ₫`
            : record.type === 'EXTRA_SPIN'
            ? `+${record.value} lượt`
            : record.value > 0
            ? record.value.toLocaleString('vi-VN')
            : '-'}
        </span>
      ),
    },
    {
      title: 'Xác Suất',
      key: 'probability',
      width: 100,
      render: (_, record) => (
        <span className="text-xs font-black text-rose-400 font-mono">
          {record.probability}%
        </span>
      ),
    },
    {
      title: 'Số Lượng / Còn Lại',
      key: 'quantity',
      width: 140,
      render: (_, record) => (
        <span className="text-xs font-semibold text-white">
          {record.quantity === -1
            ? 'Vô hạn'
            : `${record.remainingQuantity ?? record.quantity} / ${record.quantity}`}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      key: 'enabled',
      width: 90,
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.enabled}
          onChange={(checked) => handleToggleRewardEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, record, index) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip title="Lên">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => handleMoveReward(index, 'up')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 transition disabled:opacity-30 cursor-pointer"
            >
              <MoveUp className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip title="Xuống">
            <button
              type="button"
              disabled={index === rewards.length - 1}
              onClick={() => handleMoveReward(index, 'down')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 transition disabled:opacity-30 cursor-pointer"
            >
              <MoveDown className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip title="Sửa">
            <button
              type="button"
              onClick={() => handleOpenRewardModal(record)}
              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 transition cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa phần thưởng"
              description="Bạn có chắc muốn xóa phần thưởng này không?"
              onConfirm={() => handleDeleteReward(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <button
                type="button"
                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'draft',
          spinCost: 0,
          freeSpinsPerUser: 1,
          requireLogin: true,
          enabled: true,
        }}
      >
        {/* TABS NAVIGATION */}
        <div className="rounded-3xl bg-[#180718] border border-white/8 p-6 shadow-xl">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'general',
                label: (
                  <span className="flex items-center gap-2 font-bold text-xs">
                    <Settings className="w-4 h-4" />
                    <span>Thông Tin Chung</span>
                  </span>
                ),
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* CỘT TRÁI */}
                    <div className="space-y-4">
                      <Form.Item
                        name="name"
                        label={<span className="text-xs font-bold text-white">Tên Vòng Quay May Mắn</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập tên vòng quay' }]}
                      >
                        <Input
                          placeholder="Ví dụ: Vòng Quay Siêu Phẩm Liên Quân Mùa 2026"
                          onChange={handleNameChange}
                          className="rounded-xl bg-white/5 border-white/10 text-white"
                        />
                      </Form.Item>

                      <Form.Item
                        name="slug"
                        label={<span className="text-xs font-bold text-white">Slug (Đường Dẫn URL)</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
                      >
                        <Input
                          placeholder="vong-quay-sieu-pham"
                          className="rounded-xl bg-white/5 border-white/10 text-white font-mono"
                        />
                      </Form.Item>

                      <Form.Item
                        name="description"
                        label={<span className="text-xs font-bold text-white">Mô Tả Sự Kiện</span>}
                      >
                        <Input.TextArea
                          rows={3}
                          placeholder="Mô tả ngắn gọn về sự kiện để hiển thị cho người chơi..."
                          className="rounded-xl bg-white/5 border-white/10 text-white"
                        />
                      </Form.Item>

                      {/* Thumbnail URL & Upload */}
                      <Form.Item
                        name="thumbnail"
                        label={<span className="text-xs font-bold text-white">Ảnh Thumbnail / Banner</span>}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="https://..."
                              className="rounded-xl bg-white/5 border-white/10 text-white flex-1"
                            />
                            <label className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingImage ? 'Đang tải...' : 'Upload Ảnh'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadImage(file, 'thumbnail');
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </Form.Item>
                    </div>

                    {/* CỘT PHẢI: CHI PHÍ & GIỚI HẠN */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          name="spinCost"
                          label={<span className="text-xs font-bold text-white">Giá / Lượt Quay (₫)</span>}
                        >
                          <InputNumber
                            min={0}
                            step={1000}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            style={{ width: '100%' }}
                            className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                          />
                        </Form.Item>

                        <Form.Item
                          name="freeSpinsPerUser"
                          label={<span className="text-xs font-bold text-white">Lượt Quay Free Ban Đầu</span>}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                          />
                        </Form.Item>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          name="dailySpinLimit"
                          label={<span className="text-xs font-bold text-white">Giới Hạn / Ngày (Lượt)</span>}
                        >
                          <InputNumber
                            min={1}
                            placeholder="Để trống = Không giới hạn"
                            style={{ width: '100%' }}
                            className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                          />
                        </Form.Item>

                        <Form.Item
                          name="maxSpinsPerUser"
                          label={<span className="text-xs font-bold text-white">Tối Đa / User Toàn Sự Kiện</span>}
                        >
                          <InputNumber
                            min={1}
                            placeholder="Để trống = Không giới hạn"
                            style={{ width: '100%' }}
                            className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                          />
                        </Form.Item>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          name="startAt"
                          label={<span className="text-xs font-bold text-white">Thời Gian Bắt Đầu</span>}
                        >
                          <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm"
                            placeholder="Chọn ngày bắt đầu"
                            className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                          />
                        </Form.Item>

                        <Form.Item
                          name="endAt"
                          label={<span className="text-xs font-bold text-white">Thời Gian Kết Thúc</span>}
                        >
                          <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm"
                            placeholder="Chọn ngày kết thúc"
                            className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                          />
                        </Form.Item>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <Form.Item
                          name="status"
                          label={<span className="text-xs font-bold text-white">Trạng Thái</span>}
                        >
                          <Select
                            options={[
                              { value: 'draft', label: 'Bản nháp' },
                              { value: 'active', label: 'Hoạt động' },
                              { value: 'inactive', label: 'Tạm dừng' },
                              { value: 'expired', label: 'Hết hạn' },
                            ]}
                            className="w-full"
                          />
                        </Form.Item>

                        <Form.Item
                          name="enabled"
                          valuePropName="checked"
                          label={<span className="text-xs font-bold text-white">Kích Hoạt</span>}
                        >
                          <Switch />
                        </Form.Item>

                        <Form.Item
                          name="requireLogin"
                          valuePropName="checked"
                          label={<span className="text-xs font-bold text-white">Yêu Cầu Đăng Nhập</span>}
                        >
                          <Switch />
                        </Form.Item>
                      </div>
                    </div>

                    {/* THỂ LỆ FULL WIDTH */}
                    <div className="md:col-span-2">
                      <Form.Item
                        name="rules"
                        label={<span className="text-xs font-bold text-white">Thể Lệ & Quy Định Chi Tiết</span>}
                      >
                        <Input.TextArea
                          rows={4}
                          placeholder="Mỗi dòng là một quy định thể lệ..."
                          className="rounded-xl bg-white/5 border-white/10 text-white"
                        />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'rewards',
                label: (
                  <span className="flex items-center gap-2 font-bold text-xs">
                    <Gift className="w-4 h-4" />
                    <span>Cơ Cấu Phần Thưởng ({rewards.length})</span>
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-4">
                    {/* PROBABILITY VALIDATOR BAR */}
                    <div
                      className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border ${
                        isProbabilityValid
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isProbabilityValid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <span className="text-xs font-bold block">
                            {isProbabilityValid
                              ? 'Tổng xác suất đạt chuẩn 100.0%'
                              : `Tổng xác suất hiện tại: ${totalProbability}% (Cần điều chỉnh đúng 100.0% để kích hoạt)`}
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            Hệ thống tính toán dựa trên tổng xác suất của các phần thưởng đang BẬT.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black font-mono">
                          {totalProbability}% / 100%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRewardModal()}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Thêm Phần Thưởng</span>
                        </button>
                      </div>
                    </div>

                    {/* REWARDS TABLE */}
                    <div className="rounded-2xl border border-white/8 overflow-hidden bg-black/20">
                      <Table
                        columns={rewardColumns}
                        dataSource={rewards}
                        rowKey="id"
                        pagination={false}
                        className="admin-custom-table"
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: 'preview',
                label: (
                  <span className="flex items-center gap-2 font-bold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>Xem Trước Vòng Quay</span>
                  </span>
                ),
                children: (
                  <div className="flex flex-col items-center py-6">
                    <WheelCanvas
                      rewards={rewards}
                      isSpinning={previewSpinning}
                      targetIndex={previewTargetIdx}
                      onSpinEnd={() => setPreviewSpinning(false)}
                    />

                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        disabled={previewSpinning || rewards.length === 0}
                        onClick={() => {
                          if (previewSpinning || rewards.length === 0) return;
                          const randIdx = Math.floor(Math.random() * rewards.length);
                          setPreviewTargetIdx(randIdx);
                          setPreviewSpinning(true);
                        }}
                        className="py-3 px-8 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span>{previewSpinning ? 'Đang quay...' : 'Quay Thử Nghiệm'}</span>
                      </button>
                      <span className="text-[11px] text-pink-300/50">
                        * Thao tác quay thử giúp xem chuyển động của Canvas, không ảnh hưởng đến cơ sở dữ liệu.
                      </span>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#180718] border border-white/8 mt-6">
          <button
            type="button"
            onClick={() => router.push('/admin/lucky-wheel')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-950/60 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Đang lưu...' : isEdit ? 'Lưu Thay Đổi' : 'Tạo Vòng Quay'}</span>
          </button>
        </div>
      </Form>

      {/* MODAL THÊM / SỬA PHẦN THƯỞNG */}
      <Modal
        open={rewardModalOpen}
        onCancel={() => setRewardModalOpen(false)}
        onOk={handleSaveReward}
        okText={editingReward ? 'Lưu Phần Thưởng' : 'Thêm Phần Thưởng'}
        cancelText="Hủy"
        width={560}
        title={
          <div className="flex items-center gap-2 text-white text-sm font-bold">
            <Gift className="w-4 h-4 text-rose-400" />
            <span>{editingReward ? 'Chỉnh Sửa Phần Thưởng' : 'Thêm Phần Thưởng Mới'}</span>
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
        <Form
          form={rewardForm}
          layout="vertical"
          className="pt-3"
          initialValues={{
            type: 'NOTHING',
            value: 0,
            quantity: -1,
            probability: 0,
            enabled: true,
          }}
        >
          <Form.Item
            name="name"
            label={<span className="text-xs font-bold text-white">Tên Phần Thưởng</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên phần thưởng' }]}
          >
            <Input placeholder="Ví dụ: Nick Liên Quân VIP 1, 50.000 VNĐ..." className="rounded-xl bg-white/5 border-white/10 text-white" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="type"
              label={<span className="text-xs font-bold text-white">Loại Phần Thưởng</span>}
              rules={[{ required: true }]}
            >
              <Select
                onChange={(val) => setSelectedRewardType(val)}
                options={[
                  { value: 'ACCOUNT', label: 'Tài khoản Game' },
                  { value: 'COUPON', label: 'Mã giảm giá (Coupon)' },
                  { value: 'MONEY', label: 'Tiền mặt (Số dư ví)' },
                  { value: 'EXTRA_SPIN', label: 'Thêm lượt quay' },
                  { value: 'PRODUCT', label: 'Sản phẩm / Vật phẩm' },
                  { value: 'NOTHING', label: 'Không trúng (Chúc may mắn)' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="probability"
              label={<span className="text-xs font-bold text-white">Xác Suất (%)</span>}
              rules={[{ required: true, message: 'Nhập xác suất' }]}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.1}
                style={{ width: '100%' }}
                className="w-full rounded-xl bg-white/5 border-white/10 text-white"
                placeholder="Ví dụ: 10.5"
              />
            </Form.Item>
          </div>

          {/* DYNAMIC FIELDS THEO LOẠI PHẦN THƯỞNG */}
          {selectedRewardType === 'MONEY' && (
            <Form.Item
              name="value"
              label={<span className="text-xs font-bold text-white">Số Tiền Thưởng (VND)</span>}
              rules={[{ required: true, message: 'Nhập số tiền thưởng' }]}
            >
              <InputNumber
                min={1000}
                step={1000}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                style={{ width: '100%' }}
                className="w-full rounded-xl bg-white/5 border-white/10 text-white"
              />
            </Form.Item>
          )}

          {selectedRewardType === 'EXTRA_SPIN' && (
            <Form.Item
              name="value"
              label={<span className="text-xs font-bold text-white">Số Lượt Quay Cộng Thêm</span>}
              rules={[{ required: true, message: 'Nhập số lượt' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                className="w-full rounded-xl bg-white/5 border-white/10 text-white"
              />
            </Form.Item>
          )}

          {selectedRewardType === 'COUPON' && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 mb-4">
              <Form.Item
                name="couponDiscountPercent"
                label={<span className="text-xs font-bold text-purple-300">% Giảm Giá</span>}
              >
                <InputNumber
                  min={1}
                  max={100}
                  style={{ width: '100%' }}
                  className="w-full"
                  placeholder="Ví dụ: 20 (%)"
                />
              </Form.Item>

              <Form.Item
                name="couponMinOrder"
                label={<span className="text-xs font-bold text-purple-300">Đơn Hàng Tối Thiểu (₫)</span>}
              >
                <InputNumber
                  min={0}
                  step={10000}
                  style={{ width: '100%' }}
                  className="w-full"
                  placeholder="0 = Không yêu cầu"
                />
              </Form.Item>
            </div>
          )}

          {selectedRewardType === 'ACCOUNT' && (
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 mb-4">
              <Form.Item
                name="gameSlug"
                label={<span className="text-xs font-bold text-rose-300">Game Áp Dụng (Slug)</span>}
              >
                <Input placeholder="lien-quan, free-fire... (Tùy chọn)" className="rounded-xl bg-white/5 border-white/10 text-white" />
              </Form.Item>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="quantity"
              label={<span className="text-xs font-bold text-white">Tổng Số Lượng Kho</span>}
            >
              <InputNumber
                min={-1}
                placeholder="-1 = Không giới hạn"
                style={{ width: '100%' }}
                className="w-full rounded-xl bg-white/5 border-white/10 text-white"
              />
            </Form.Item>

            <Form.Item
              name="color"
              label={<span className="text-xs font-bold text-white">Màu Lát Cắt Sector</span>}
            >
              <div className="flex items-center gap-2">
                <Input type="color" className="w-12 h-8 p-0 rounded-lg cursor-pointer bg-transparent border-0" />
                <Input placeholder="#e11d48" className="rounded-xl bg-white/5 border-white/10 text-white font-mono flex-1" />
              </div>
            </Form.Item>
          </div>

          <Form.Item
            name="enabled"
            valuePropName="checked"
            label={<span className="text-xs font-bold text-white">Bật Phần Thưởng Này</span>}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

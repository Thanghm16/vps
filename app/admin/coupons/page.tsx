'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
    PlusCircle,
    Edit,
    Trash2,
    Copy,
    Calendar,
    TicketPercent,
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    History,
    Sparkles,
    Percent,
    DollarSign,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { Table, Modal, Form, Input, InputNumber, Select, App, Popconfirm, Switch, Tag, Drawer, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface CouponItem {
    id: string;
    _id: string;
    code: string;
    description: string;
    type: 'percentage' | 'fixed';
    discountType: 'percentage' | 'fixed';
    value: number;
    discountValue: number;
    minOrderValue: number;
    minOrder: number;
    maxDiscount: number | null;
    usageLimit: number | null;
    usedCount: number;
    usageLimitPerUser: number | null;
    startAt: string | null;
    endAt: string | null;
    startDate: string;
    endDate: string;
    isActive: boolean;
    status: 'active' | 'inactive' | 'expired';
    applicableProducts: string[];
    applicableCategories: string[];
    excludedProducts: string[];
    createdAt: string;
    updatedAt: string;
}

interface UsageHistoryItem {
    id: string;
    code: string;
    customerName: string;
    accountCode: string;
    gameName: string;
    amount: number;
    discountAmount: number;
    createdAt: string;
}

export default function AdminCouponsPage() {
    const { message } = App.useApp();
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(15);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<CouponItem | null>(null);
    const [usageHistory, setUsageHistory] = useState<UsageHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [gameCategories, setGameCategories] = useState<{ label: string; value: string }[]>([]);
    const [form] = Form.useForm();
    const discountTypeValue = Form.useWatch('type', form);

    // Tải danh mục game cho bộ lọc áp dụng
    useEffect(() => {
        async function loadGames() {
            try {
                const res = await fetch('/api/games');
                const data = await res.json();
                if (data.success && Array.isArray(data.games)) {
                    setGameCategories(
                        data.games.map((g: { name: string; slug: string }) => ({
                            label: g.name,
                            value: g.slug,
                        })),
                    );
                }
            } catch (err) {
                console.warn('Lỗi tải danh mục game:', err);
            }
        }
        loadGames();
    }, []);

    // Tải danh sách coupon từ API
    const fetchCoupons = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(pageSize));
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (typeFilter !== 'all') params.set('type', typeFilter);

            const res = await fetch(`/api/admin/coupons?${params.toString()}`, {
                cache: 'no-store',
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.coupons)) {
                setCoupons(data.coupons);
                setTotalCount(data.total || 0);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách mã giảm giá:', err);
            message.error('Không thể tải danh sách mã giảm giá.');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchQuery, statusFilter, typeFilter, message]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    // Mở modal tạo mới
    const handleOpenCreate = () => {
        setEditingCoupon(null);
        form.resetFields();
        form.setFieldsValue({
            code: '',
            description: '',
            type: 'percentage',
            value: 10,
            minOrderValue: 100000,
            maxDiscount: 50000,
            usageLimit: 100,
            usageLimitPerUser: 1,
            isActive: true,
            applicableCategories: [],
        });
        setIsModalOpen(true);
    };

    // Mở modal chỉnh sửa
    const handleOpenEdit = (coupon: CouponItem) => {
        setEditingCoupon(coupon);
        form.setFieldsValue({
            code: coupon.code,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
            minOrderValue: coupon.minOrderValue,
            maxDiscount: coupon.maxDiscount,
            usageLimit: coupon.usageLimit,
            usageLimitPerUser: coupon.usageLimitPerUser,
            dateRange:
                coupon.startAt || coupon.endAt
                    ? [coupon.startAt ? dayjs(coupon.startAt) : null, coupon.endAt ? dayjs(coupon.endAt) : null]
                    : null,
            isActive: coupon.isActive,
            applicableCategories: coupon.applicableCategories || [],
        });
        setIsModalOpen(true);
    };

    // Tạo mã ngẫu nhiên
    const generateRandomCode = () => {
        const prefixes = ['SALE', 'VIP', 'GAMER', 'PROMO', 'SHOP', 'GIFT'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const num = Math.floor(10 + Math.random() * 90);
        const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        const generated = `${prefix}${num}${randomSuffix}`;
        form.setFieldValue('code', generated);
    };

    // Lưu mã giảm giá
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            let startAt: string | null = null;
            let endAt: string | null = null;

            if (values.dateRange && Array.isArray(values.dateRange)) {
                if (values.dateRange[0]) {
                    startAt = values.dateRange[0].toISOString();
                }
                if (values.dateRange[1]) {
                    endAt = values.dateRange[1].toISOString();
                }
            }

            const payload = {
                code: values.code,
                description: values.description,
                type: values.type,
                value: values.value,
                minOrderValue: values.minOrderValue || 0,
                maxDiscount: values.type === 'percentage' ? values.maxDiscount || null : null,
                usageLimit: values.usageLimit || null,
                usageLimitPerUser: values.usageLimitPerUser || null,
                startAt,
                endAt,
                isActive: values.isActive ?? true,
                applicableCategories: values.applicableCategories || [],
            };

            const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
            const method = editingCoupon ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                message.success(data.message || 'Lưu mã giảm giá thành công!');
                setIsModalOpen(false);
                fetchCoupons();
            } else {
                message.error(data.message || 'Không thể lưu mã giảm giá.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Xóa mã giảm giá
    const handleDelete = async (couponId: string) => {
        try {
            const res = await fetch(`/api/admin/coupons/${couponId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok && data.success) {
                message.success(data.message || 'Đã xóa mã giảm giá!');
                fetchCoupons();
            } else {
                message.error(data.message || 'Không thể xóa mã giảm giá.');
            }
        } catch (err) {
            console.error(err);
            message.error('Lỗi khi xóa mã giảm giá.');
        }
    };

    // Bật/tắt trạng thái
    const handleToggleStatus = async (coupon: CouponItem) => {
        try {
            const res = await fetch(`/api/admin/coupons/${coupon.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !coupon.isActive }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                message.success(data.message || 'Đã cập nhật trạng thái!');
                setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c)));
            } else {
                message.error(data.message || 'Lỗi cập nhật trạng thái.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Xem lịch sử sử dụng
    const handleViewHistory = async (coupon: CouponItem) => {
        setSelectedCoupon(coupon);
        setDetailDrawerOpen(true);
        try {
            setHistoryLoading(true);
            const res = await fetch(`/api/admin/coupons/${coupon.id}`);
            const data = await res.json();
            if (data.success) {
                setUsageHistory(data.usageHistory || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleCopyCode = (code: string) => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(code);
            message.success(`Đã sao chép mã voucher ${code}!`);
        }
    };

    const columns: ColumnsType<CouponItem> = [
        {
            title: 'MÃ VOUCHER',
            dataIndex: 'code',
            key: 'code',
            render: (code: string, record) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-rose-400 text-sm tracking-wide bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                            {code}
                        </span>
                        <button
                            onClick={() => handleCopyCode(code)}
                            className="text-pink-300/40 hover:text-white transition p-1"
                            title="Sao chép mã"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {record.description && (
                        <span className="text-[11px] text-pink-200/60 line-clamp-1 max-w-[220px]">
                            {record.description}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: 'LOẠI & MỨC GIẢM',
            dataIndex: 'type',
            key: 'type',
            render: (_: string, record) => (
                <div>
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                        {record.type === 'percentage' ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                                <Percent className="w-3.5 h-3.5" />
                                Giảm {record.value}%
                            </span>
                        ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                Giảm {formatPrice(record.value)}
                            </span>
                        )}
                    </div>
                    {record.type === 'percentage' && record.maxDiscount && (
                        <div className="text-[10px] text-pink-300/50 mt-0.5">
                            Tối đa: {formatPrice(record.maxDiscount)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'ĐƠN TỐI THIỂU',
            dataIndex: 'minOrderValue',
            key: 'minOrderValue',
            render: (val: number) => (
                <span className="font-bold text-white text-xs">
                    {val > 0 ? formatPrice(val) : '0 ₫ (Không giới hạn)'}
                </span>
            ),
        },
        {
            title: 'LƯỢT DÙNG',
            dataIndex: 'usedCount',
            key: 'usedCount',
            render: (used: number, record) => {
                const limit = record.usageLimit;
                const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return (
                    <div className="flex flex-col gap-1 min-w-[100px]">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>{used} lượt</span>
                            <span className="text-[10px] text-pink-300/50">/ {limit ? `${limit}` : '∞'}</span>
                        </div>
                        {limit && (
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${
                                        percent >= 100 ? 'bg-red-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'
                                    }`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'THỜI HẠN',
            dataIndex: 'endAt',
            key: 'endAt',
            render: (_: string, record) => {
                const isExpired = record.endAt && new Date() > new Date(record.endAt);
                return (
                    <div className="flex flex-col text-[11px]">
                        <span className="text-white font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-pink-300/60" />
                            {record.endDate}
                        </span>
                        {isExpired ? (
                            <span className="text-[10px] text-red-400 font-bold">Đã hết hạn</span>
                        ) : (
                            <span className="text-[10px] text-emerald-400 font-semibold">Đang áp dụng</span>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'TRẠNG THÁI',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean, record) => (
                <Switch
                    checked={isActive}
                    onChange={() => handleToggleStatus(record)}
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                />
            ),
        },
        {
            title: 'THAO TÁC',
            key: 'actions',
            render: (_, record) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleViewHistory(record)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300 hover:text-white transition"
                        title="Xem lịch sử sử dụng"
                    >
                        <History className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleOpenEdit(record)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-rose-300 hover:text-rose-200 transition"
                        title="Chỉnh sửa mã"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <Popconfirm
                        title="Xóa mã giảm giá"
                        description={`Bạn có chắc chắn muốn xóa mã "${record.code}"?`}
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <button
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                            title="Xóa mã"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* HEADER PAGE */}
            <AdminPageHeader
                title="Quản Lý Mã Giảm Giá"
                description="Thiết lập các chương trình khuyến mãi, voucher chiết khấu cho khách hàng"
                action={
                    <button
                        onClick={handleOpenCreate}
                        className="btn-gradient-hero px-4 py-2 rounded-xl text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-950/40"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Tạo Voucher Mới</span>
                    </button>
                }
            />

            {/* FILTER & SEARCH BAR */}
            <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/8 flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-pink-300/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Tìm theo mã voucher, mô tả..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50"
                        />
                    </div>

                    <Select
                        value={typeFilter}
                        onChange={setTypeFilter}
                        className="w-36"
                        options={[
                            { label: 'Tất cả loại', value: 'all' },
                            { label: 'Phần trăm (%)', value: 'percentage' },
                            { label: 'Cố định (₫)', value: 'fixed' },
                        ]}
                    />

                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        className="w-36"
                        options={[
                            { label: 'Tất cả trạng thái', value: 'all' },
                            { label: 'Đang kích hoạt', value: 'active' },
                            { label: 'Đã tạm dừng', value: 'inactive' },
                            { label: 'Đã hết hạn', value: 'expired' },
                        ]}
                    />
                </div>

                <button
                    onClick={fetchCoupons}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-pink-200"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
                    <span>Làm mới</span>
                </button>
            </div>

            {/* TABLE */}
            <div className="rounded-2xl bg-[#170616]/80 border border-white/8 overflow-hidden p-2">
                <Table
                    columns={columns}
                    dataSource={coupons}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalCount,
                        onChange: (p) => setPage(p),
                        showTotal: (total) => `Tổng cộng ${total} mã giảm giá`,
                    }}
                    locale={{ emptyText: 'Không tìm thấy mã giảm giá nào.' }}
                />
            </div>

            {/* MODAL TẠO / SỬA MÃ GIẢM GIÁ */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-white font-bold">
                        <TicketPercent className="w-5 h-5 text-rose-500" />
                        <span>{editingCoupon ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}</span>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleSubmit}
                confirmLoading={submitting}
                okText={editingCoupon ? 'Cập Nhật' : 'Tạo Mã'}
                cancelText="Hủy"
                width={620}
                styles={{
                    body: { padding: '1rem 0' },
                    header: { background: 'transparent' },
                }}
            >
                <Form form={form} layout="vertical" className="space-y-3">
                    {/* Mã Voucher */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        <div className="sm:col-span-8">
                            <Form.Item
                                name="code"
                                label="Mã Voucher"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập mã voucher!' },
                                    {
                                        pattern: /^[A-Z0-9_-]{2,30}$/i,
                                        message: 'Mã từ 2-30 ký tự (chữ, số, gạch ngang)!',
                                    },
                                ]}
                                normalize={(value) => (value || '').toUpperCase().trim()}
                            >
                                <Input placeholder="VD: SALE20, GAMER50K" />
                            </Form.Item>
                        </div>
                        <div className="sm:col-span-4 pt-7">
                            <button
                                type="button"
                                onClick={generateRandomCode}
                                className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-200 flex items-center justify-center gap-1.5 transition"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Mã ngẫu nhiên</span>
                            </button>
                        </div>
                    </div>

                    {/* Mô tả */}
                    <Form.Item name="description" label="Mô Tả Khuyến Mãi">
                        <Input.TextArea
                            rows={2}
                            placeholder="VD: Giảm 20% tối đa 50.000 ₫ cho tất cả các nick Liên Quân..."
                        />
                    </Form.Item>

                    {/* Loại & Giá trị giảm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Form.Item name="type" label="Loại Giảm Giá" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { label: 'Phần trăm (%)', value: 'percentage' },
                                    { label: 'Số tiền cố định (₫)', value: 'fixed' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            name="value"
                            label={discountTypeValue === 'percentage' ? 'Phần Trăm Giảm (%)' : 'Số Tiền Giảm (₫)'}
                            rules={[
                                { required: true, message: 'Vui lòng nhập giá trị giảm!' },
                                {
                                    type: 'number',
                                    min: 1,
                                    max: discountTypeValue === 'percentage' ? 100 : 100000000,
                                    message: 'Giá trị không hợp lệ!',
                                },
                            ]}
                        >
                            <InputNumber
                                className="w-full"
                                style={{ width: '100%' }}
                                placeholder={discountTypeValue === 'percentage' ? 'VD: 20' : 'VD: 50000'}
                                formatter={(val) =>
                                    discountTypeValue === 'fixed'
                                        ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                                        : `${val}`
                                }
                            />
                        </Form.Item>
                    </div>

                    {/* Điều kiện đơn tối thiểu & Giảm tối đa */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Form.Item
                            name="minOrderValue"
                            label="Giá Trị Đơn Tối Thiểu (₫)"
                            tooltip="Đơn hàng phải đạt từ mức này trở lên mới áp dụng được mã"
                        >
                            <InputNumber
                                className="w-full"
                                style={{ width: '100%' }}
                                min={0}
                                placeholder="VD: 200000"
                                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            />
                        </Form.Item>

                        {discountTypeValue === 'percentage' ? (
                            <Form.Item
                                name="maxDiscount"
                                label="Giảm Tối Đa (₫)"
                                tooltip="Mức trần giảm giá tối đa (để trống nếu không giới hạn)"
                            >
                                <InputNumber
                                    className="w-full"
                                    style={{ width: '100%' }}
                                    min={0}
                                    placeholder="VD: 100000 (Để trống = ∞)"
                                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                />
                            </Form.Item>
                        ) : null}
                    </div>

                    {/* Giới hạn lượt sử dụng */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Form.Item
                            name="usageLimit"
                            label="Tổng Lượt Dùng Toàn Sàn"
                            tooltip="Tổng số lần mã này được sử dụng trên toàn hệ thống"
                        >
                            <InputNumber
                                className="w-full"
                                style={{ width: '100%' }}
                                min={1}
                                placeholder="Để trống = Không giới hạn"
                            />
                        </Form.Item>

                        <Form.Item
                            name="usageLimitPerUser"
                            label="Giới Hạn / Mỗi Khách Hàng"
                            tooltip="Mỗi tài khoản người dùng chỉ được dùng tối đa bao nhiêu lần"
                        >
                            <InputNumber
                                className="w-full"
                                style={{ width: '100%' }}
                                min={1}
                                placeholder="Mặc định: 1 lần"
                            />
                        </Form.Item>
                    </div>

                    {/* Thời gian áp dụng */}
                    <Form.Item
                        name="dateRange"
                        label="Thời Gian Hiệu Lực"
                        tooltip="Chọn khoảng ngày bắt đầu và kết thúc (để trống nếu áp dụng ngay và vô thời hạn)"
                    >
                        <DatePicker.RangePicker
                            className="w-full"
                            format="DD/MM/YYYY"
                            placeholder={['Bắt đầu ngay', 'Vô thời hạn']}
                        />
                    </Form.Item>

                    {/* Danh mục game áp dụng */}
                    <Form.Item
                        name="applicableCategories"
                        label="Áp Dụng Cho Danh Mục Game"
                        tooltip="Chọn các game áp dụng mã giảm giá này (để trống = áp dụng cho tất cả game)"
                    >
                        <Select mode="multiple" placeholder="Tất cả danh mục game" options={gameCategories} />
                    </Form.Item>

                    {/* Kích hoạt */}
                    <Form.Item name="isActive" valuePropName="checked">
                        <div className="flex items-center gap-2">
                            <Switch defaultChecked />
                            <span className="text-xs text-white font-medium">
                                Kích hoạt mã giảm giá ngay sau khi lưu
                            </span>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>

            {/* DRAWER XEM LỊCH SỬ SỬ DỤNG VOUCHER */}
            <Drawer
                title={
                    <div className="flex items-center gap-2 text-white">
                        <History className="w-5 h-5 text-rose-500" />
                        <span>Lịch Sử Sử Dụng Mã {selectedCoupon?.code}</span>
                    </div>
                }
                open={detailDrawerOpen}
                onClose={() => setDetailDrawerOpen(false)}
                size={460}
            >
                {selectedCoupon && (
                    <div className="space-y-5 text-white">
                        {/* Thống kê nhanh */}
                        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div>
                                <span className="text-[10px] text-pink-300/60 uppercase">Tổng Lượt Dùng</span>
                                <div className="text-base font-black text-rose-400 mt-0.5">
                                    {selectedCoupon.usedCount} / {selectedCoupon.usageLimit || '∞'}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-pink-300/60 uppercase">Loại Giảm Giá</span>
                                <div className="text-base font-black text-white mt-0.5">
                                    {selectedCoupon.type === 'percentage'
                                        ? `${selectedCoupon.value}%`
                                        : formatPrice(selectedCoupon.value)}
                                </div>
                            </div>
                        </div>

                        {/* Bảng đơn hàng đã áp dụng */}
                        <div>
                            <h4 className="text-xs font-bold text-pink-200 mb-3 uppercase tracking-wider">
                                Đơn Hàng Gần Đây Đã Áp Dụng ({usageHistory.length})
                            </h4>

                            {historyLoading ? (
                                <div className="py-8 text-center text-xs text-pink-300/50">Đang tải lịch sử...</div>
                            ) : usageHistory.length === 0 ? (
                                <div className="py-8 text-center text-xs text-pink-300/40 border border-white/5 rounded-xl">
                                    Chưa có đơn hàng nào sử dụng mã này.
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {usageHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 rounded-xl bg-[#190918] border border-white/8 flex flex-col gap-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-rose-400 text-xs">
                                                    {item.code}
                                                </span>
                                                <span className="text-emerald-400 font-bold text-xs">
                                                    - {formatPrice(item.discountAmount)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-pink-300/70">
                                                <span>{item.customerName}</span>
                                                <span>
                                                    {item.accountCode} ({item.gameName})
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-pink-300/40 text-right mt-0.5">
                                                {item.createdAt}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}

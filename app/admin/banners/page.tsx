'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  ExternalLink,
  Smartphone,
  Monitor,
  MousePointerClick,
  Link as LinkIcon,
  Image as ImageIcon,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  App,
  Popconfirm,
  Switch,
  Tag,
  DatePicker,
  Radio,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';

interface BannerItem {
  id: string;
  _id: string;
  title: string;
  subtitle: string;
  desktopImage: {
    url: string;
    publicId?: string;
  };
  mobileImage?: {
    url: string;
    publicId?: string;
  };
  imageUrl: string;
  buttonText: string;
  ctaText: string;
  link: string;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  scheduleStatus: 'active' | 'inactive' | 'expired' | 'scheduled';
  clickCount: number;
  startAt: string | null;
  endAt: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBannersPage() {
  const { message } = App.useApp();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal state
  const [previewBanner, setPreviewBanner] = useState<BannerItem | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Upload States
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [desktopPreviewUrl, setDesktopPreviewUrl] = useState('');
  const [mobilePreviewUrl, setMobilePreviewUrl] = useState('');

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const [form] = Form.useForm();

  // 1. Tải danh sách banner từ API
  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/banners?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.banners)) {
        setBanners(data.banners);
        setTotalCount(data.total || 0);
      } else {
        message.error(data.message || 'Lỗi tải danh sách banner.');
      }
    } catch (e) {
      console.error('Fetch banners error:', e);
      message.error('Không thể kết nối máy chủ để lấy dữ liệu banner.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, message]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // 2. Upload ảnh Desktop lên S3 Cloudfly
  const handleUploadDesktop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'banners');

    try {
      setUploadingDesktop(true);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        form.setFieldValue('desktopImage', data.url);
        setDesktopPreviewUrl(data.url);
        message.success('Tải ảnh Desktop lên S3 Cloudfly thành công!');
      } else {
        message.error(data.message || 'Tải ảnh Desktop thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải ảnh Desktop lên S3.');
    } finally {
      setUploadingDesktop(false);
      if (desktopFileInputRef.current) desktopFileInputRef.current.value = '';
    }
  };

  // 3. Upload ảnh Mobile lên S3 Cloudfly
  const handleUploadMobile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'banners');

    try {
      setUploadingMobile(true);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        form.setFieldValue('mobileImage', data.url);
        setMobilePreviewUrl(data.url);
        message.success('Tải ảnh Mobile lên S3 Cloudfly thành công!');
      } else {
        message.error(data.message || 'Tải ảnh Mobile thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải ảnh Mobile lên S3.');
    } finally {
      setUploadingMobile(false);
      if (mobileFileInputRef.current) mobileFileInputRef.current.value = '';
    }
  };

  // 4. Mở Modal tạo mới
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setDesktopPreviewUrl('');
    setMobilePreviewUrl('');
    form.resetFields();
    form.setFieldsValue({
      sortOrder: (banners.length || 0) + 1,
      isActive: true,
      buttonText: 'Xem Ngay',
      link: '/#kho-nick',
      openInNewTab: false,
    });
    setIsModalOpen(true);
  };

  // 5. Mở Modal chỉnh sửa
  const handleOpenEdit = (banner: BannerItem) => {
    setEditingBanner(banner);
    const dUrl = banner.desktopImage?.url || banner.imageUrl || '';
    const mUrl = banner.mobileImage?.url || '';

    setDesktopPreviewUrl(dUrl);
    setMobilePreviewUrl(mUrl);

    form.setFieldsValue({
      title: banner.title,
      subtitle: banner.subtitle,
      desktopImage: dUrl,
      mobileImage: mUrl,
      buttonText: banner.buttonText || banner.ctaText || 'Xem Ngay',
      link: banner.link,
      openInNewTab: Boolean(banner.openInNewTab),
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      dateRange:
        banner.startAt || banner.endAt
          ? [
              banner.startAt ? dayjs(banner.startAt) : null,
              banner.endAt ? dayjs(banner.endAt) : null,
            ]
          : undefined,
    });
    setIsModalOpen(true);
  };

  // 6. Xóa banner
  const handleDelete = async (bannerId: string) => {
    try {
      const res = await fetch(`/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa banner thành công!');
        fetchBanners();
      } else {
        message.error(data.message || 'Xóa banner thất bại.');
      }
    } catch {
      message.error('Lỗi hệ thống khi xóa banner.');
    }
  };

  // 7. Bật/tắt nhanh trạng thái hiển thị
  const handleToggleStatus = async (banner: BannerItem, nextActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message || 'Đã cập nhật trạng thái banner!');
        setBanners((prev) =>
          prev.map((b) =>
            b.id === banner.id
              ? {
                  ...b,
                  isActive: nextActive,
                  status: nextActive ? 'active' : 'inactive',
                  scheduleStatus: nextActive ? 'active' : 'inactive',
                }
              : b
          )
        );
      } else {
        message.error(data.message || 'Lỗi cập nhật trạng thái.');
      }
    } catch {
      message.error('Lỗi kết nối khi cập nhật trạng thái banner.');
    }
  };

  // 8. Submit Form Tạo/Sửa
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let startAt: string | null = null;
      let endAt: string | null = null;

      if (values.dateRange && Array.isArray(values.dateRange)) {
        if (values.dateRange[0]) {
          startAt = (values.dateRange[0] as Dayjs).toISOString();
        }
        if (values.dateRange[1]) {
          endAt = (values.dateRange[1] as Dayjs).toISOString();
        }
      }

      const payload = {
        title: values.title.trim(),
        subtitle: values.subtitle ? values.subtitle.trim() : '',
        desktopImage: {
          url: values.desktopImage.trim(),
        },
        mobileImage: values.mobileImage?.trim()
          ? { url: values.mobileImage.trim() }
          : undefined,
        buttonText: values.buttonText ? values.buttonText.trim() : 'Xem Ngay',
        link: values.link ? values.link.trim() : '',
        openInNewTab: Boolean(values.openInNewTab),
        sortOrder: Number(values.sortOrder) || 1,
        isActive: Boolean(values.isActive),
        startAt,
        endAt,
      };

      const url = editingBanner
        ? `/api/admin/banners/${editingBanner.id}`
        : '/api/admin/banners';
      const method = editingBanner ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        message.success(data.message || 'Lưu banner thành công!');
        setIsModalOpen(false);
        fetchBanners();
      } else {
        message.error(data.message || 'Có lỗi xảy ra khi lưu banner.');
      }
    } catch (e: any) {
      if (e?.errorFields) {
        message.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      } else {
        console.error(e);
        message.error('Lỗi lưu thông tin banner.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Thống kê nhanh
  const stats = React.useMemo(() => {
    const total = totalCount;
    const active = banners.filter((b) => b.isActive && b.scheduleStatus === 'active').length;
    const scheduled = banners.filter((b) => b.isActive && b.scheduleStatus === 'scheduled').length;
    const expired = banners.filter((b) => b.scheduleStatus === 'expired').length;
    const totalClicks = banners.reduce((sum, b) => sum + (b.clickCount || 0), 0);
    return { total, active, scheduled, expired, totalClicks };
  }, [banners, totalCount]);

  // Cột bảng
  const columns: ColumnsType<BannerItem> = [
    {
      title: 'THỨ TỰ',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 75,
      align: 'center',
      render: (order: number) => (
        <span className="font-mono font-bold text-rose-300 text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
          #{order}
        </span>
      ),
    },
    {
      title: 'HÌNH ẢNH BANNER',
      key: 'bannerImage',
      width: 300,
      render: (_, record) => {
        const dImg = record.desktopImage?.url || record.imageUrl || '/1768727344439.jpg';
        const mImg = record.mobileImage?.url;

        return (
          <div className="flex items-start gap-3">
            <div
              className="relative w-28 h-16 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex-shrink-0 cursor-pointer group shadow-md"
              onClick={() => {
                setPreviewBanner(record);
                setPreviewDevice('desktop');
              }}
            >
              <Image
                src={dImg}
                alt={record.title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="112px"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Eye className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="font-bold text-white text-xs line-clamp-1 group-hover:text-rose-300 transition">
                {record.title}
              </div>
              {record.subtitle && (
                <div className="text-[11px] text-pink-300/60 line-clamp-1 mt-0.5">
                  {record.subtitle}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Monitor className="w-2.5 h-2.5" /> Desktop
                </span>
                {mImg ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Smartphone className="w-2.5 h-2.5" /> Mobile riêng
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-zinc-800/80 text-zinc-400 border border-white/5 text-[9px]">
                    Auto Fallback
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'NÚT BẤM & ĐÍCH ĐẾN',
      key: 'link',
      width: 220,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-600/30 to-pink-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs">
              [{record.buttonText || record.ctaText || 'Xem Ngay'}]
            </span>
            {record.openInNewTab && (
              <span
                className="text-[10px] text-pink-300/60 flex items-center gap-0.5"
                title="Mở trong tab mới"
              >
                <ArrowUpRight className="w-3 h-3 text-pink-400" /> Tab mới
              </span>
            )}
          </div>
          {record.link ? (
            <a
              href={record.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-pink-300/70 hover:text-white font-mono truncate max-w-[200px] flex items-center gap-1 transition"
            >
              <LinkIcon className="w-3 h-3 flex-shrink-0 text-pink-400" />
              <span className="truncate">{record.link}</span>
            </a>
          ) : (
            <span className="text-[11px] text-zinc-500 italic">Không có link</span>
          )}
        </div>
      ),
    },
    {
      title: 'LỊCH TRÌNH HIỂN THỊ',
      key: 'schedule',
      width: 180,
      render: (_, record) => {
        const now = new Date();
        const start = record.startAt ? new Date(record.startAt) : null;
        const end = record.endAt ? new Date(record.endAt) : null;

        let badge = null;
        if (!record.isActive) {
          badge = (
            <Tag color="default" className="text-[10px] font-bold">
              Đã Tắt
            </Tag>
          );
        } else if (start && now < start) {
          badge = (
            <Tag color="processing" className="text-[10px] font-bold">
              Chưa bắt đầu
            </Tag>
          );
        } else if (end && now > end) {
          badge = (
            <Tag color="warning" className="text-[10px] font-bold">
              Đã hết hạn
            </Tag>
          );
        } else {
          badge = (
            <Tag color="success" className="text-[10px] font-bold">
              Đang hiển thị
            </Tag>
          );
        }

        return (
          <div className="space-y-1">
            <div>{badge}</div>
            <div className="text-[10px] text-pink-300/60 flex items-center gap-1">
              <Clock className="w-3 h-3 text-pink-400/70 flex-shrink-0" />
              <span className="truncate">
                {record.startAt ? dayjs(record.startAt).format('DD/MM/YYYY') : 'Bất đầu'} →{' '}
                {record.endAt ? dayjs(record.endAt).format('DD/MM/YYYY') : 'Vô thời hạn'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'LƯỢT CLICK',
      dataIndex: 'clickCount',
      key: 'clickCount',
      width: 100,
      align: 'center',
      render: (clicks: number) => (
        <div className="flex items-center justify-center gap-1 font-mono font-bold text-xs text-white">
          <MousePointerClick className="w-3.5 h-3.5 text-rose-400" />
          <span>{(clicks || 0).toLocaleString()}</span>
        </div>
      ),
    },
    {
      title: 'BẬT/TẮT',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      align: 'center',
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleStatus(record, checked)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPreviewBanner(record);
              setPreviewDevice('desktop');
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white transition"
            title="Xem trước Banner"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenEdit(record)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600/20 text-pink-200 hover:text-white transition"
            title="Sửa Banner"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          <Popconfirm
            title="Xác nhận xóa banner này?"
            description="Thao tác này không thể hoàn tác."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-rose-400 transition"
              title="Xóa Banner"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <AdminPageHeader
        title="Quản Lý Banner Trang Chủ"
        description="Quản lý slider carousel trang chủ, hình ảnh chiến dịch khuyến mãi, sự kiện game và liên kết"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchBanners()}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white transition"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Tạo Banner Mới</span>
            </button>
          </div>
        }
      />

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-pink-300/60 font-medium">Tổng Banner</div>
            <div className="text-lg font-black text-white">{stats.total}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-pink-300/60 font-medium">Đang Hiển Thị</div>
            <div className="text-lg font-black text-emerald-400">{stats.active}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-pink-300/60 font-medium">Lên Lịch Trước</div>
            <div className="text-lg font-black text-blue-400">{stats.scheduled}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-pink-300/60 font-medium">Đã Hết Hạn</div>
            <div className="text-lg font-black text-amber-400">{stats.expired}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-pink-300/60 font-medium">Tổng Lượt Click</div>
            <div className="text-lg font-black text-purple-300">
              {stats.totalClicks.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-pink-300/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              fetchBanners();
            }}
            placeholder="Tìm theo tiêu đề, link..."
            className="pl-9 h-10 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-pink-300/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            className="w-full md:w-44"
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang hiển thị' },
              { value: 'inactive', label: 'Đã tắt' },
              { value: 'scheduled', label: 'Chưa bắt đầu' },
              { value: 'expired', label: 'Đã hết hạn' },
            ]}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="p-5 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={banners}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total: totalCount,
              onChange: (p) => setPage(p),
              showTotal: (total) => `Tổng cộng ${total} banner`,
            }}
          />
        </div>
      </div>

      {/* MODAL THÊM / SỬA BANNER */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingBanner ? 'Lưu Thay Đổi' : 'Tạo Banner'}
        cancelText="Hủy"
        width={680}
        title={
          <span className="text-white font-bold text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            {editingBanner ? 'Sửa Banner Trang Chủ' : 'Tạo Banner Slider Mới'}
          </span>
        }
        styles={{
          body: {
            background: '#180a17',
            padding: '1.25rem',
            maxHeight: 'calc(85vh - 120px)',
            overflowY: 'auto',
          },
          header: {
            background: '#1a0a19',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Form form={form} layout="vertical" className="space-y-4 pt-1">
          {/* Tiêu đề & Phụ đề */}
          <div className="space-y-3">
            <Form.Item
              name="title"
              label={<span className="text-xs font-semibold text-pink-200">Tiêu Đề Banner *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề banner!' }]}
            >
              <Input placeholder="VD: SIÊU SALE LIÊN QUÂN VIP 2026" />
            </Form.Item>

            <Form.Item
              name="subtitle"
              label={<span className="text-xs font-semibold text-pink-200">Phụ Đề / Mô Tả Ngắn</span>}
            >
              <Input placeholder="VD: Tặng ngay voucher giảm 20% khi nạp qua VietQR" />
            </Form.Item>
          </div>

          {/* Upload Ảnh Desktop */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                Ảnh Desktop (Bắt buộc, tỉ lệ 16:9 hoặc 21:9)
              </span>
              <input
                ref={desktopFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadDesktop}
              />
              <button
                type="button"
                disabled={uploadingDesktop}
                onClick={() => desktopFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-semibold transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploadingDesktop ? 'Đang tải lên S3...' : 'Tải file lên Cloudfly'}</span>
              </button>
            </div>

            <Form.Item
              name="desktopImage"
              rules={[{ required: true, message: 'Vui lòng tải lên hoặc nhập URL ảnh Desktop!' }]}
              className="mb-2"
            >
              <Input
                placeholder="https://s3.cloudfly.vn/... hoặc /banner.jpg"
                onChange={(e) => setDesktopPreviewUrl(e.target.value)}
              />
            </Form.Item>

            {desktopPreviewUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                <Image
                  src={desktopPreviewUrl}
                  alt="Desktop Preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {/* Upload Ảnh Mobile (Tùy chọn) */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                  Ảnh Mobile (Tùy chọn)
                </span>
                <span className="text-[10px] text-pink-300/60 block">
                  Nếu bỏ trống, hệ thống sẽ tự động sử dụng ảnh Desktop để hiển thị.
                </span>
              </div>
              <input
                ref={mobileFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadMobile}
              />
              <button
                type="button"
                disabled={uploadingMobile}
                onClick={() => mobileFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploadingMobile ? 'Đang tải lên S3...' : 'Tải file lên Cloudfly'}</span>
              </button>
            </div>

            <Form.Item name="mobileImage" className="mb-2">
              <Input
                placeholder="URL ảnh dành riêng cho điện thoại (tùy chọn)"
                onChange={(e) => setMobilePreviewUrl(e.target.value)}
              />
            </Form.Item>

            {mobilePreviewUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                <Image
                  src={mobilePreviewUrl}
                  alt="Mobile Preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {/* Chữ nút CTA & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="buttonText"
              label={<span className="text-xs font-semibold text-pink-200">Chữ Nút Bấm (CTA)</span>}
            >
              <Input placeholder="Xem Ngay, Mua Ngay, Nạp Ngay..." />
            </Form.Item>

            <Form.Item
              name="link"
              label={<span className="text-xs font-semibold text-pink-200">Đường Dẫn Liên Kết (Link)</span>}
            >
              <Input placeholder="/#kho-nick hoặc /account/LQ102..." />
            </Form.Item>
          </div>

          {/* Mở tab mới & Thứ tự */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="openInNewTab"
              valuePropName="checked"
              label={<span className="text-xs font-semibold text-pink-200">Mở Trong Tab Mới</span>}
            >
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>

            <Form.Item
              name="sortOrder"
              label={<span className="text-xs font-semibold text-pink-200">Thứ Tự Slide (1, 2, 3...)</span>}
            >
              <InputNumber min={1} max={99} className="w-full" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          {/* Lịch trình hiển thị & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Form.Item
                name="dateRange"
                label={
                  <span className="text-xs font-semibold text-pink-200">
                    Thời Gian Hiển Thị (Bỏ trống nếu vô thời hạn)
                  </span>
                }
              >
                <DatePicker.RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  placeholder={['Bắt đầu', 'Kết thúc']}
                  className="w-full"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div>
              <Form.Item
                name="isActive"
                valuePropName="checked"
                label={<span className="text-xs font-semibold text-pink-200">Kích Hoạt Ngay</span>}
              >
                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      {/* PREVIEW BANNER MODAL (SIMULATOR) */}
      <Modal
        open={!!previewBanner}
        onCancel={() => setPreviewBanner(null)}
        footer={null}
        width={previewDevice === 'desktop' ? 820 : 420}
        title={
          <div className="flex items-center justify-between pr-8">
            <span className="text-white font-bold text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-400" />
              Xem Trước Banner Trang Chủ
            </span>
            <Radio.Group
              value={previewDevice}
              onChange={(e) => setPreviewDevice(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="desktop">
                <div className="flex items-center gap-1 text-xs">
                  <Monitor className="w-3 h-3" /> Desktop
                </div>
              </Radio.Button>
              <Radio.Button value="mobile">
                <div className="flex items-center gap-1 text-xs">
                  <Smartphone className="w-3 h-3" /> Mobile
                </div>
              </Radio.Button>
            </Radio.Group>
          </div>
        }
        styles={{
          body: {
            background: '#140613',
            padding: '1.25rem',
          },
          header: {
            background: '#190a18',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        {previewBanner && (
          <div className="flex flex-col items-center">
            {previewDevice === 'desktop' ? (
              /* DESKTOP PREVIEW SIMULATION */
              <div className="relative w-full aspect-[21/9] min-h-[340px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group flex flex-col justify-end p-6">
                <Image
                  src={previewBanner.desktopImage?.url || previewBanner.imageUrl || '/1768727344439.jpg'}
                  alt={previewBanner.title}
                  fill
                  unoptimized
                  className="object-cover"
                />

                <div className="relative z-10 max-w-lg space-y-2 p-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-600/30 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-rose-400" /> Sàn Giao Dịch Nick VIP 2026
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                    {previewBanner.title}
                  </h2>
                  {previewBanner.subtitle && (
                    <p className="text-xs text-pink-100/90 drop-shadow">
                      {previewBanner.subtitle}
                    </p>
                  )}
                  <div className="pt-2">
                    <button className="px-6 py-2.5 rounded-full btn-gradient-hero text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 hover:scale-105 transition">
                      <span>{previewBanner.buttonText || previewBanner.ctaText || 'Khám Phá Ngay'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* MOBILE PREVIEW SIMULATION */
              <div className="relative w-full max-w-[340px] aspect-[9/14] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl flex flex-col justify-end p-4 bg-black">
                <Image
                  src={
                    previewBanner.mobileImage?.url ||
                    previewBanner.desktopImage?.url ||
                    previewBanner.imageUrl ||
                    '/1768727344439.jpg'
                  }
                  alt={previewBanner.title}
                  fill
                  unoptimized
                  className="object-cover"
                />

                <div className="relative z-10 space-y-2 p-3.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 shadow-2xl">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600/30 text-rose-300 border border-rose-500/40 uppercase">
                    <Sparkles className="w-3 h-3 text-rose-400" /> Hot Event
                  </span>
                  <h3 className="text-base font-black text-white leading-tight">
                    {previewBanner.title}
                  </h3>
                  {previewBanner.subtitle && (
                    <p className="text-[11px] text-pink-100/90 line-clamp-2">
                      {previewBanner.subtitle}
                    </p>
                  )}
                  <div className="pt-1.5">
                    <button className="w-full py-2.5 rounded-full btn-gradient-hero text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5">
                      <span>{previewBanner.buttonText || previewBanner.ctaText || 'Khám Phá Ngay'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

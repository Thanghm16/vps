'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import CategoryManagerDrawer from '@/components/admin/news/CategoryManagerDrawer';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Pin,
  FolderTree,
  Copy,
  Archive,
  Send,
  MoreVertical,
  ExternalLink,
  Layers,
  Filter,
  RotateCcw,
  Newspaper,
  BookOpen,
} from 'lucide-react';
import {
  Table,
  Button,
  Input,
  Select,
  Switch,
  Tag,
  Popconfirm,
  Dropdown,
  App,
  Modal,
  type MenuProps,
} from 'antd';
import { NewsClientData, NewsCategoryClientData } from '@/types/db-news';
import dayjs from 'dayjs';

export default function AdminNewsListPage() {
  const { message } = App.useApp();

  // Data & Pagination
  const [articles, setArticles] = useState<NewsClientData[]>([]);
  const [categories, setCategories] = useState<NewsCategoryClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [pinnedFilter, setPinnedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  // Stats
  const [stats, setStats] = useState<{
    total: number;
    draft: number;
    published: number;
    scheduled: number;
    archived: number;
    totalViews: number;
  }>({
    total: 0,
    draft: 0,
    published: 0,
    scheduled: 0,
    archived: 0,
    totalViews: 0,
  });

  // Bulk selection
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Category Drawer
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

  // 1. Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/news/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh mục:', err);
    }
  }, []);

  // 2. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/news/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn('Lỗi lấy thống kê tin tức:', err);
    }
  }, []);

  // 3. Fetch News List
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (featuredFilter !== 'all') params.set('featured', featuredFilter);
      if (pinnedFilter !== 'all') params.set('pinned', pinnedFilter);
      if (sortBy) params.set('sortBy', sortBy);

      const res = await fetch(`/api/admin/news?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.news)) {
        setArticles(data.news);
        setTotalCount(data.total || 0);
      } else {
        message.error(data.message || 'Lỗi tải danh sách bài viết.');
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể kết nối máy chủ để lấy bài viết.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, categoryFilter, featuredFilter, pinnedFilter, sortBy, message]);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Quick Action Handlers
  const handleQuickPublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}/publish`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        message.success('Xuất bản bài viết thành công!');
        fetchNews();
        fetchStats();
      } else {
        message.error(data.message || 'Thao tác thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xuất bản.');
    }
  };

  const handleQuickUnpublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}/unpublish`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        message.success('Chuyển bài viết về Bản nháp thành công!');
        fetchNews();
        fetchStats();
      } else {
        message.error(data.message || 'Thao tác thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi gỡ xuất bản.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        message.success('Nhân bản bài viết thành công!');
        fetchNews();
        fetchStats();
      } else {
        message.error(data.message || 'Nhân bản thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi nhân bản.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Xóa bài viết thành công!');
        fetchNews();
        fetchStats();
      } else {
        message.error(data.message || 'Xóa thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa bài viết.');
    }
  };

  const handleToggleFeatured = async (record: NewsClientData, checked: boolean) => {
    try {
      const res = await fetch(`/api/admin/news/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: checked }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(checked ? 'Đã gắn nổi bật bài viết!' : 'Đã bỏ nổi bật!');
        fetchNews();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePinned = async (record: NewsClientData, checked: boolean) => {
    try {
      const res = await fetch(`/api/admin/news/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: checked }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(checked ? 'Đã ghim bài viết lên đầu!' : 'Đã bỏ ghim!');
        fetchNews();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'archive' | 'delete') => {
    if (!selectedRowKeys.length) return;
    try {
      setBulkLoading(true);
      const res = await fetch('/api/admin/news/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedRowKeys }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message || 'Thao tác hàng loạt thành công!');
        setSelectedRowKeys([]);
        fetchNews();
        fetchStats();
      } else {
        message.error(data.message || 'Lỗi thao tác hàng loạt.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi thực thi thao tác hàng loạt.');
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Tag color="success">Đã xuất bản</Tag>;
      case 'scheduled':
        return <Tag color="purple">Lên lịch đăng</Tag>;
      case 'archived':
        return <Tag color="default">Đã lưu trữ</Tag>;
      default:
        return <Tag color="warning">Bản nháp</Tag>;
    }
  };

  const columns = [
    {
      title: 'Bài viết',
      key: 'article',
      render: (_: any, record: NewsClientData) => (
        <div className="flex items-start gap-3 min-w-[280px] max-w-[420px]">
          {/* Thumbnail */}
          <div className="relative w-16 h-11 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0">
            {record.thumbnail ? (
              <Image
                src={record.thumbnail}
                alt={record.title}
                fill
                unoptimized
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-pink-300/40 text-[10px]">
                No img
              </div>
            )}
          </div>

          {/* Title & Slug */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/news/${record.id}/edit`}
              className="font-bold text-xs sm:text-sm text-white hover:text-rose-400 transition line-clamp-2 leading-snug"
            >
              {record.title}
            </Link>
            <div className="text-[11px] text-pink-300/60 font-mono truncate mt-0.5">
              /{record.slug}
            </div>
            {record.tags && record.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mt-1">
                {record.tags.slice(0, 3).map((t, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.2 rounded text-[9px] bg-white/5 border border-white/8 text-pink-200/70"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 140,
      render: (cat: string) => (
        <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          {cat || 'Chung'}
        </span>
      ),
    },
    {
      title: 'Tác giả',
      key: 'author',
      width: 130,
      render: (_: any, record: NewsClientData) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {record.author?.name ? record.author.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <span className="text-xs text-white/90 truncate font-medium">
            {record.author?.name || 'Admin'}
          </span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: 'Nổi bật',
      dataIndex: 'isFeatured',
      key: 'isFeatured',
      width: 80,
      align: 'center' as const,
      render: (isFeatured: boolean, record: NewsClientData) => (
        <Switch
          size="small"
          checked={isFeatured}
          onChange={(checked) => handleToggleFeatured(record, checked)}
        />
      ),
    },
    {
      title: 'Ghim',
      dataIndex: 'isPinned',
      key: 'isPinned',
      width: 80,
      align: 'center' as const,
      render: (isPinned: boolean, record: NewsClientData) => (
        <Switch
          size="small"
          checked={isPinned}
          onChange={(checked) => handleTogglePinned(record, checked)}
        />
      ),
    },
    {
      title: 'Lượt xem',
      dataIndex: 'views',
      key: 'views',
      width: 90,
      align: 'center' as const,
      render: (views: number) => (
        <span className="text-xs font-mono text-pink-200">
          {(views || 0).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Ngày đăng',
      key: 'publishedAt',
      width: 140,
      render: (_: any, record: NewsClientData) => (
        <div className="text-xs text-pink-300/70">
          {record.publishedAt ? (
            dayjs(record.publishedAt).format('DD/MM/YYYY HH:mm')
          ) : (
            <span className="text-zinc-500 italic">Chưa đăng</span>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: NewsClientData) => {
        const actionMenuItems: MenuProps['items'] = [
          {
            key: 'preview',
            icon: <ExternalLink className="w-3.5 h-3.5" />,
            label: (
              <a href={`/tin-tuc/${record.slug}`} target="_blank" rel="noopener noreferrer">
                Xem trên web
              </a>
            ),
          },
          {
            key: 'edit',
            icon: <Edit className="w-3.5 h-3.5" />,
            label: <Link href={`/admin/news/${record.id}/edit`}>Chỉnh sửa bài viết</Link>,
          },
          {
            key: 'duplicate',
            icon: <Copy className="w-3.5 h-3.5" />,
            label: 'Nhân bản (Duplicate)',
            onClick: () => handleDuplicate(record.id),
          },
          {
            type: 'divider',
          },
          ...(record.status !== 'published'
            ? [
                {
                  key: 'publish',
                  icon: <Send className="w-3.5 h-3.5 text-emerald-400" />,
                  label: <span className="text-emerald-400">Xuất bản ngay</span>,
                  onClick: () => handleQuickPublish(record.id),
                },
              ]
            : [
                {
                  key: 'unpublish',
                  icon: <Archive className="w-3.5 h-3.5 text-amber-400" />,
                  label: <span className="text-amber-400">Chuyển về Bản nháp</span>,
                  onClick: () => handleQuickUnpublish(record.id),
                },
              ]),
          {
            key: 'delete',
            icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
            label: <span className="text-rose-400">Xóa bài viết</span>,
            onClick: () => {
              Modal.confirm({
                title: 'Xác nhận xóa bài viết?',
                content: `Bạn có chắc chắn muốn xóa bài "${record.title}"?`,
                okText: 'Xóa vĩnh viễn',
                okButtonProps: { danger: true },
                cancelText: 'Hủy',
                onOk: () => handleDelete(record.id),
              });
            },
          },
        ];

        return (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/news/${record.id}/edit`}
              className="p-1.5 rounded-lg text-pink-300/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Chỉnh sửa"
            >
              <Edit className="w-3.5 h-3.5" />
            </Link>

            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="p-1.5 rounded-lg text-pink-300/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Tùy chọn khác"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. ADMIN HEADER */}
      <AdminPageHeader
        title="Quản Lý Tin Tức & Bài Viết"
        description="Soạn thảo, quản lý bài viết tin tức, hướng dẫn game, danh mục và tối ưu SEO công cụ tìm kiếm."
        action={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCategoryDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-pink-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderTree className="w-4 h-4 text-purple-400" />
              <span>Quản Lý Danh Mục</span>
            </button>

            <Link
              href="/admin/news/create"
              className="px-4 py-2 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-lg shadow-rose-950/60 flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bài Viết Mới</span>
            </Link>
          </div>
        }
      />

      {/* 2. STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#180817] border border-white/8 flex flex-col justify-between">
          <span className="text-[11px] text-pink-300/60 font-medium">Tổng bài viết</span>
          <span className="text-xl font-black text-white mt-1">{stats.total}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#180817] border border-white/8 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400/80 font-medium">Đã xuất bản</span>
          <span className="text-xl font-black text-emerald-400 mt-1">{stats.published}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#180817] border border-white/8 flex flex-col justify-between">
          <span className="text-[11px] text-amber-400/80 font-medium">Bản nháp</span>
          <span className="text-xl font-black text-amber-400 mt-1">{stats.draft}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#180817] border border-white/8 flex flex-col justify-between">
          <span className="text-[11px] text-purple-400/80 font-medium">Lên lịch đăng</span>
          <span className="text-xl font-black text-purple-400 mt-1">{stats.scheduled}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#180817] border border-white/8 flex flex-col justify-between">
          <span className="text-[11px] text-pink-300/60 font-medium">Đã lưu trữ</span>
          <span className="text-xl font-black text-zinc-400 mt-1">{stats.archived}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#180817] border border-white/8 flex flex-col justify-between">
          <span className="text-[11px] text-rose-400/80 font-medium">Tổng lượt xem</span>
          <span className="text-xl font-black text-rose-400 mt-1 font-mono">
            {stats.totalViews.toLocaleString('vi-VN')}
          </span>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS TOOLBAR */}
      <div className="p-4 rounded-2xl bg-[#180917]/80 border border-white/10 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-300/40" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, slug, tag..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1c081c] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            {/* Category */}
            <Select
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              className="w-36 custom-admin-select"
              options={[
                { value: 'all', label: 'Tất cả danh mục' },
                ...categories.map((c) => ({ value: c.slug, label: c.name })),
              ]}
            />

            {/* Status */}
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              className="w-32 custom-admin-select"
              options={[
                { value: 'all', label: 'Mọi trạng thái' },
                { value: 'published', label: 'Đã xuất bản' },
                { value: 'draft', label: 'Bản nháp' },
                { value: 'scheduled', label: 'Lên lịch' },
                { value: 'archived', label: 'Lưu trữ' },
              ]}
            />

            {/* Sort */}
            <Select
              value={sortBy}
              onChange={(v) => {
                setSortBy(v);
                setPage(1);
              }}
              className="w-32 custom-admin-select"
              options={[
                { value: 'createdAt', label: 'Mới tạo nhất' },
                { value: 'publishedAt', label: 'Ngày đăng' },
                { value: 'views', label: 'Lượt xem cao' },
                { value: 'title', label: 'Tên A-Z' },
              ]}
            />

            {/* Reset Filter Button */}
            {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setPage(1);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300/60 hover:text-white transition cursor-pointer"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* BULK ACTIONS BAR (KHI CÓ ROW ĐƯỢC CHỌN) */}
        {selectedRowKeys.length > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 animate-in fade-in duration-200">
            <div className="text-xs font-semibold text-rose-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>
                Đang chọn <strong>{selectedRowKeys.length}</strong> bài viết
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="small"
                onClick={() => handleBulkAction('publish')}
                loading={bulkLoading}
                className="bg-emerald-600/80 hover:bg-emerald-600 text-white border-none text-xs"
              >
                Xuất bản
              </Button>
              <Button
                size="small"
                onClick={() => handleBulkAction('unpublish')}
                loading={bulkLoading}
                className="bg-amber-600/80 hover:bg-amber-600 text-white border-none text-xs"
              >
                Bản nháp
              </Button>
              <Button
                size="small"
                onClick={() => handleBulkAction('archive')}
                loading={bulkLoading}
                className="bg-zinc-700 hover:bg-zinc-600 text-white border-none text-xs"
              >
                Lưu trữ
              </Button>
              <Popconfirm
                title="Xác nhận xóa hàng loạt?"
                description={`Bạn có chắc muốn xóa vĩnh viễn ${selectedRowKeys.length} bài viết đã chọn?`}
                onConfirm={() => handleBulkAction('delete')}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger loading={bulkLoading} className="text-xs">
                  Xóa
                </Button>
              </Popconfirm>
              <Button
                size="small"
                type="text"
                onClick={() => setSelectedRowKeys([])}
                className="text-pink-300/60 hover:text-white text-xs"
              >
                Bỏ chọn
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN NEWS TABLE */}
      <div className="rounded-2xl bg-[#140513] border border-white/10 overflow-hidden shadow-xl">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={articles}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (total, range) => (
              <span className="text-xs text-pink-300/60">
                Hiển thị {range[0]}-{range[1]} / <strong>{total}</strong> bài viết
              </span>
            ),
          }}
          className="custom-admin-table"
        />
      </div>

      {/* 5. CATEGORY MANAGEMENT DRAWER */}
      <CategoryManagerDrawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        onCategoryChange={() => {
          fetchCategories();
          fetchNews();
        }}
      />
    </div>
  );
}

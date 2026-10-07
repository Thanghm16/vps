'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { GameAccount } from '@/types/account';
import { AccountCredentials } from '@/types/db-account';
import { formatPrice } from '@/lib/utils';
import StatusBadge from '@/components/admin/common/StatusBadge';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import AccountFormModal from '@/components/admin/accounts/AccountFormModal';
import {
  Search,
  PlusCircle,
  Eye,
  Edit,
  EyeOff,
  Trash2,
  Star,
  RefreshCw,
  Lock,
  Copy,
  Database,
} from 'lucide-react';
import { Table, Input, Select, Popconfirm, App, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface GameCategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function AdminAccountsPage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [games, setGames] = useState<GameCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<(GameAccount & { credentials?: AccountCredentials }) | null>(null);
  const [viewCredentialsAccount, setViewCredentialsAccount] = useState<(GameAccount & { credentials?: AccountCredentials }) | null>(null);

  // 1. Tải danh mục game từ MongoDB
  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/games');
      const data = await res.json();
      if (data.success && Array.isArray(data.games)) {
        setGames(data.games);
      }
    } catch (e) {
      console.error('Fetch games failed:', e);
    }
  }, []);

  // 2. Tải kho nick từ MongoDB theo phân trang và bộ lọc
  const fetchAccounts = useCallback(async (
    targetPage = 1,
    targetGame = selectedGame,
    targetStatus = selectedStatus,
    targetSearch = searchQuery
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));
      if (targetGame !== 'all') params.set('game', targetGame);
      if (targetStatus !== 'all') params.set('status', targetStatus);
      if (targetSearch.trim()) params.set('search', targetSearch.trim());

      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        setTotalCount(data.total || 0);
        setPage(data.page || targetPage);
      } else {
        message.error(data.message || 'Không thể tải kho nick.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [selectedGame, selectedStatus, searchQuery, pageSize, message]);

  // Initial load
  useEffect(() => {
    fetchGames();
    fetchAccounts(1);
  }, [fetchGames, fetchAccounts]);

  // Handler khi thay đổi game category filter
  const handleGameChange = (val: string) => {
    setSelectedGame(val);
    setPage(1);
    fetchAccounts(1, val, selectedStatus, searchQuery);
  };

  // Handler khi thay đổi status filter
  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setPage(1);
    fetchAccounts(1, selectedGame, val, searchQuery);
  };

  // Handler khi tìm kiếm
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setPage(1);
    fetchAccounts(1, selectedGame, selectedStatus, val);
  };

  // Sắp xếp dữ liệu client-side trên trang hiện tại
  const sortedAccounts = useMemo(() => {
    const list = [...accounts];
    if (sortBy === 'price-low') return list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') return list.sort((a, b) => b.price - a.price);
    if (sortBy === 'views') return list.sort((a, b) => (b.views || 0) - (a.views || 0));
    return list;
  }, [accounts, sortBy]);

  // Ẩn / Hiện nick
  const handleToggleHide = async (account: GameAccount) => {
    const targetStatus = account.status === 'hidden' ? 'available' : 'hidden';
    try {
      const targetId = account._id || account.code;
      const res = await fetch(`/api/admin/accounts/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(
          targetStatus === 'hidden'
            ? `Đã ẩn nick ${account.code} khỏi sàn.`
            : `Đã mở bán nick ${account.code} trở lại.`
        );
        fetchAccounts();
      } else {
        message.error(data.message || 'Cập nhật trạng thái thất bại.');
      }
    } catch {
      message.error('Lỗi kết nối khi cập nhật trạng thái.');
    }
  };

  // Xóa nick
  const handleDelete = async (account: GameAccount) => {
    try {
      const targetId = account._id || account.code;
      const res = await fetch(`/api/admin/accounts/${targetId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        message.success(`Đã xóa nick ${account.code} khỏi kho!`);
        fetchAccounts();
      } else {
        message.error(data.message || 'Xóa nick thất bại.');
      }
    } catch {
      message.error('Lỗi kết nối khi xóa nick.');
    }
  };

  // Lưu nick (Tạo mới hoặc Sửa)
  const handleSaveAccount = async (accountData: Record<string, unknown>) => {
    try {
      if (editingAccount) {
        const targetId = editingAccount._id || editingAccount.code;
        const res = await fetch(`/api/admin/accounts/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountData),
        });
        const data = await res.json();
        if (data.success) {
          message.success('Đã cập nhật thông tin nick!');
          setIsFormOpen(false);
          setEditingAccount(null);
          fetchAccounts();
        } else {
          message.error(data.message || 'Cập nhật thất bại.');
        }
      } else {
        const res = await fetch('/api/admin/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountData),
        });
        const data = await res.json();
        if (data.success) {
          message.success('Đã thêm nick mới vào kho thành công!');
          setIsFormOpen(false);
          fetchAccounts();
        } else {
          message.error(data.message || 'Thêm nick thất bại.');
        }
      }
    } catch {
      message.error('Lỗi kết nối khi lưu tài khoản.');
    }
  };

  // Gieo dữ liệu mẫu nếu kho rỗng
  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        fetchGames();
        fetchAccounts();
      } else {
        message.error(data.message || 'Lỗi khi gieo dữ liệu.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setSeeding(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Đã sao chép ${label}!`);
  };

  const columns: ColumnsType<GameAccount> = [
    {
      title: 'ẢNH & MÃ NICK',
      key: 'thumbnail',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex-shrink-0">
            <Image
              src={record.thumbnail || '/1768727344439.jpg'}
              alt={record.code}
              fill
              unoptimized
              className="object-cover object-top"
              sizes="56px"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-rose-400 text-xs">{record.code}</span>
              {record.isFeatured && (
                <span className="p-0.5 rounded bg-amber-500/20 text-amber-400" title="Nick nổi bật">
                  <Star className="w-3 h-3 fill-amber-400" />
                </span>
              )}
            </div>
            <div className="text-[11px] text-pink-200/80 font-medium truncate max-w-[160px]">
              {record.title}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'TỰA GAME',
      key: 'game',
      render: (_, record) => (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/5 text-pink-200 border border-white/10">
          {record.gameName || record.gameSlug}
        </span>
      ),
    },
    {
      title: 'RANK & THÔNG SỐ (MIXED)',
      key: 'details',
      render: (_, record) => {
        const details = (record.details || {}) as Record<string, unknown>;
        const rank = (details.rank as string) || record.rank || 'Tiêu chuẩn';
        const champs = (details.championsCount as number) ?? record.championsCount ?? (details.heroCount as number) ?? 0;
        const skins = (details.skinsCount as number) ?? record.skinsCount ?? (details.skinCount as number) ?? 0;

        return (
          <div className="text-xs">
            <div className="font-bold text-amber-300">{rank}</div>
            <div className="text-[11px] text-pink-300/70">
              <span>{champs} Tướng</span>
              <span className="mx-1">•</span>
              <span>{skins} Skin</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'GIÁ BÁN',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record) => (
        <div>
          <div className="font-black text-rose-400 text-xs">{formatPrice(price)}</div>
          {record.originalPrice && record.originalPrice > price && (
            <div className="text-[10px] text-pink-300/40 line-through">
              {formatPrice(record.originalPrice)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} size="sm" />,
    },
    {
      title: 'ĐĂNG NHẬP',
      key: 'credentials',
      render: (_, record) => {
        const creds = record.credentials;
        if (!creds?.loginUsername) {
          return <span className="text-[11px] text-white/30 italic">Chưa lưu</span>;
        }
        return (
          <button
            type="button"
            onClick={() => setViewCredentialsAccount(record)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-semibold border border-rose-500/20 transition"
            title="Xem tài khoản đăng nhập bàn giao"
          >
            <Lock className="w-3 h-3 text-rose-400" />
            <span>Xem pass</span>
          </button>
        );
      },
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const cleanCode = encodeURIComponent(record.code.replace('#', ''));
              window.open(`/account/${cleanCode}`, '_blank');
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white transition cursor-pointer"
            title="Xem trang chi tiết sản phẩm"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAccount(record);
              setIsFormOpen(true);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600/20 text-pink-200 hover:text-white transition"
            title="Chỉnh sửa nick"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleToggleHide(record)}
            className={`p-1.5 rounded-lg transition ${
              record.status === 'hidden'
                ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'bg-white/5 text-pink-200 hover:bg-white/10'
            }`}
            title={record.status === 'hidden' ? 'Mở bán lại' : 'Tạm ẩn nick'}
          >
            {record.status === 'hidden' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <Popconfirm
            title={`Xác nhận xóa nick ${record.code}?`}
            description="Thao tác này không thể hoàn tác và nick sẽ bị xóa khỏi kho MongoDB."
            onConfirm={() => handleDelete(record)}
            okText="Xóa vĩnh viễn"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-rose-400 transition"
              title="Xóa nick khỏi kho"
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
        title="Quản Lý Kho Nick Game"
        description="Đăng bán, cập nhật giá, thông số mixed linh hoạt và bảo mật thông tin bàn giao trên MongoDB"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAccounts(page)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-pink-200 border border-white/10 transition"
              title="Làm mới kho"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {accounts.length === 0 && (
              <button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-xs font-semibold text-purple-300 border border-purple-500/30 transition"
                title="Khởi tạo nick game mẫu"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{seeding ? 'Đang tạo...' : 'Gieo Kho Nick Mẫu'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Đăng Nick Mới</span>
            </button>
          </div>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-[#170616]/90 border border-white/5 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <Input
          prefix={<Search className="w-4 h-4 text-pink-300/40 mr-1" />}
          placeholder="Tìm theo mã nick, tên, rank..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
          className="bg-black/30 border-white/10 text-white rounded-xl"
        />

        {/* Game Filter */}
        <Select
          value={selectedGame}
          onChange={handleGameChange}
          className="w-full"
          options={[
            { value: 'all', label: 'Tất cả tựa game' },
            ...games.map((g) => ({ value: g.slug, label: g.name })),
          ]}
        />

        {/* Status Filter */}
        <Select
          value={selectedStatus}
          onChange={handleStatusChange}
          className="w-full"
          options={[
            { value: 'all', label: 'Tất cả trạng thái' },
            { value: 'available', label: 'Đang bán' },
            { value: 'sold', label: 'Đã bán' },
            { value: 'reserved', label: 'Đang giữ' },
            { value: 'hidden', label: 'Đang ẩn' },
          ]}
        />

        {/* Sort */}
        <Select
          value={sortBy}
          onChange={(val) => setSortBy(val)}
          className="w-full"
          options={[
            { value: 'newest', label: 'Mới đăng nhất' },
            { value: 'price-low', label: 'Giá: Thấp đến Cao' },
            { value: 'price-high', label: 'Giá: Cao đến Thấp' },
            { value: 'views', label: 'Nhiều lượt xem nhất' },
          ]}
        />
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-pink-200/60 font-medium">Tổng số nick:</span>
          <span className="font-bold text-white font-mono">{totalCount.toLocaleString('vi-VN')}</span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-pink-200/60 font-medium">Trang hiện tại:</span>
          <span className="font-bold text-emerald-400 font-mono">
            {page} / {Math.ceil(totalCount / pageSize) || 1}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-pink-200/60 font-medium">Số nick / trang:</span>
          <span className="font-bold text-pink-300 font-mono">
            {accounts.length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-pink-200/60 font-medium">Danh mục chọn:</span>
          <span className="font-bold text-amber-400 font-mono truncate max-w-[100px]">
            {selectedGame === 'all' ? 'Tất cả' : selectedGame}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={sortedAccounts}
            rowKey={(r) => r._id || r.code}
            loading={loading}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: totalCount,
              onChange: (p) => {
                setPage(p);
                fetchAccounts(p);
              },
              showSizeChanger: false,
              className: 'custom-admin-pagination text-white',
            }}
          />
        </div>
      </div>

      {/* FORM THÊM / CHỈNH SỬA TÀI KHOẢN */}
      <AccountFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAccount(null);
        }}
        initialAccount={editingAccount}
        games={games}
        onSave={handleSaveAccount}
      />

      {/* MODAL XEM THÔNG TIN BẢO MẬT & ĐĂNG NHẬP (CHỈ ADMIN) */}
      <Modal
        open={!!viewCredentialsAccount}
        onCancel={() => setViewCredentialsAccount(null)}
        footer={null}
        width={480}
        title={
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <Lock className="w-5 h-5" />
            <span>Thông Tin Đăng Nhập #{viewCredentialsAccount?.code}</span>
          </div>
        }
        styles={{
          body: { background: '#180a17', padding: '1.25rem' },
          header: { background: '#1a0a19', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' },
        }}
      >
        {viewCredentialsAccount && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-pink-300/60 text-[11px]">Tài khoản đăng nhập:</div>
                <div className="text-white font-mono font-bold text-sm">
                  {viewCredentialsAccount.credentials?.loginUsername || 'Chưa cung cấp'}
                </div>
              </div>
              {viewCredentialsAccount.credentials?.loginUsername && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(viewCredentialsAccount.credentials?.loginUsername || '', 'tài khoản')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-pink-300/60 text-[11px]">Mật khẩu:</div>
                <div className="text-rose-400 font-mono font-bold text-sm">
                  {viewCredentialsAccount.credentials?.loginPassword || '••••••••'}
                </div>
              </div>
              {viewCredentialsAccount.credentials?.loginPassword && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(viewCredentialsAccount.credentials?.loginPassword || '', 'mật khẩu')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <div className="text-pink-300/60 text-[11px]">Tình trạng Email:</div>
                <div className="text-white font-medium mt-0.5">
                  {viewCredentialsAccount.credentials?.emailBound || 'Trắng thông tin'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <div className="text-pink-300/60 text-[11px]">Tình trạng SĐT:</div>
                <div className="text-white font-medium mt-0.5">
                  {viewCredentialsAccount.credentials?.phoneBound || 'Trắng thông tin'}
                </div>
              </div>
            </div>

            {viewCredentialsAccount.credentials?.twoFactorCode && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <div className="text-pink-300/60 text-[11px]">Mã 2FA dự phòng:</div>
                <div className="text-emerald-400 font-mono font-bold mt-0.5">
                  {viewCredentialsAccount.credentials.twoFactorCode}
                </div>
              </div>
            )}

            {viewCredentialsAccount.credentials?.note && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <div className="text-pink-300/60 text-[11px]">Ghi chú bàn giao:</div>
                <div className="text-pink-200/80 mt-0.5">
                  {viewCredentialsAccount.credentials.note}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatPrice } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
  Search, Eye, UserCheck, Ban, Mail, Calendar, X, Award,
  Wallet, Plus, Minus, RefreshCw, Users, ShoppingBag,
  TrendingUp, Clock, CheckCircle, XCircle, Filter,
  ChevronLeft, ChevronRight, CreditCard, Shield, ShieldOff,
  Crown, User,
} from 'lucide-react';
import { App, Popconfirm, Drawer, Tabs, Select } from 'antd';

// ── Types ──────────────────────────────────────────────────────────────────
interface CustomerRecord {
  id: string;
  userCode?: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  status: string;
  balance: number;
  avatar: string | null;
  vipLevel: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
  lastLoginAt: string | null;
}

interface CustomerDetail extends CustomerRecord {
  orders: {
    id: string; code: string; accountCode: string;
    accountTitle: string; gameName: string; amount: number;
    status: string; createdAt: string;
  }[];
  transactions: {
    id: string; code: string; amount: number; transferType: string;
    status: string; content: string; gateway: string; time: string;
  }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function VipBadge({ level }: { level: string }) {
  const cls = level.includes('Kim Cương')
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : level.includes('VIP 4')
    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    : level.includes('VIP 3')
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/20'
    : level.includes('VIP 2')
    ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
    : level.includes('VIP 1')
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
    : 'bg-white/5 text-pink-300/50 border-white/10';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{level}</span>;
}

function RoleBadge({ role }: { role: 'user' | 'admin' }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
      <Crown className="w-2.5 h-2.5" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-700/60 text-zinc-300 border border-white/10">
      <User className="w-2.5 h-2.5" /> Người dùng
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active' || status === 'success' || status === 'delivered')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle className="w-2.5 h-2.5" />
        {status === 'active' ? 'Hoạt động' : status === 'delivered' ? 'Hoàn thành' : 'Thành công'}
      </span>
    );
  if (status === 'blocked')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
        <XCircle className="w-2.5 h-2.5" /> Đã khóa
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
      <Clock className="w-2.5 h-2.5" /> Đang xử lý
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminCustomersPage() {
  const { message, modal } = App.useApp();
  const [customers, setCustomers]   = useState<CustomerRecord[]>([]);
  const [loading, setLoading]       = useState(false);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [roleFilter, setRoleFilter]       = useState('all');
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  // Detail drawer
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [detail, setDetail]           = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Balance modal
  const [balanceAction, setBalanceAction] = useState<{
    id: string; username: string; balance: number; type: 'add' | 'deduct';
  } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);

  // ── Fetch danh sách ────────────────────────────────────────────────────
  const fetchCustomers = useCallback(
    async (p = 1, q = search, s = statusFilter, r = roleFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
        if (q.trim()) params.set('search', q.trim());
        if (s !== 'all') params.set('status', s);
        if (r !== 'all') params.set('role', r);

        const res  = await fetch(`/api/admin/customers?${params}`);
        const data = await res.json();
        if (data.success) {
          setCustomers(data.customers);
          setTotal(data.total);
          setTotalPages(data.totalPages);
          setPage(data.page);
        } else {
          message.error(data.message || 'Lỗi tải danh sách.');
        }
      } catch {
        message.error('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, roleFilter, message]
  );

  useEffect(() => { fetchCustomers(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchCustomers(1, val, statusFilter, roleFilter), 400);
  };

  // ── Xem chi tiết ────────────────────────────────────────────────────────
  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res  = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setDetail({ ...data.customer, orders: data.orders, transactions: data.transactions });
      } else {
        message.error(data.message);
      }
    } catch {
      message.error('Lỗi tải chi tiết.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Khóa / Mở khóa ────────────────────────────────────────────────────
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'blocked' ? 'unblock' : 'block';
    try {
      const res  = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, action }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, status: data.newStatus } : c));
        if (detail?.id === id) setDetail((p) => p ? { ...p, status: data.newStatus } : p);
      } else {
        message.error(data.message);
      }
    } catch {
      message.error('Lỗi kết nối.');
    }
  };

  // ── Đổi quyền ─────────────────────────────────────────────────────────
  const handleSetRole = async (id: string, username: string, currentRole: 'user' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const label   = newRole === 'admin' ? 'nâng lên Admin' : 'hạ xuống Người Dùng';

    modal.confirm({
      title: `Đổi quyền tài khoản?`,
      content: (
        <div className="text-sm">
          Bạn muốn <strong>{label}</strong> cho tài khoản{' '}
          <strong className="text-rose-400">{username}</strong>?
          {newRole === 'admin' && (
            <p className="text-amber-400 mt-2 text-xs">
              ⚠️ Admin có toàn quyền quản trị hệ thống. Hãy chắc chắn trước khi cấp.
            </p>
          )}
        </div>
      ),
      okText: newRole === 'admin' ? '✓ Cấp quyền Admin' : '✓ Hạ xuống User',
      cancelText: 'Hủy',
      okButtonProps: { danger: newRole === 'admin' },
      onOk: async () => {
        try {
          const res  = await fetch('/api/admin/customers', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id, action: 'set_role', newRole }),
          });
          const data = await res.json();
          if (data.success) {
            message.success(data.message);
            setCustomers((prev) =>
              prev.map((c) => c.id === id ? { ...c, role: data.newRole } : c)
            );
            if (detail?.id === id) setDetail((p) => p ? { ...p, role: data.newRole } : p);
          } else {
            message.error(data.message);
          }
        } catch {
          message.error('Lỗi kết nối.');
        }
      },
    });
  };

  // ── Nạp / Trừ tiền ────────────────────────────────────────────────────
  const handleBalanceAction = async () => {
    if (!balanceAction) return;
    const amount = parseFloat(balanceAmount.replace(/[^0-9]/g, ''));
    if (!amount || amount <= 0) { message.warning('Vui lòng nhập số tiền hợp lệ.'); return; }

    setBalanceLoading(true);
    try {
      const res  = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: balanceAction.id,
          action: balanceAction.type === 'add' ? 'add_balance' : 'deduct_balance',
          amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        setCustomers((prev) =>
          prev.map((c) => c.id === balanceAction.id ? { ...c, balance: data.newBalance } : c)
        );
        if (detail?.id === balanceAction.id) setDetail((p) => p ? { ...p, balance: data.newBalance } : p);
        setBalanceAction(null);
        setBalanceAmount('');
      } else {
        message.error(data.message);
      }
    } catch {
      message.error('Lỗi kết nối.');
    } finally {
      setBalanceLoading(false);
    }
  };

  // ── Stat cards ────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Tổng tài khoản',
      value: total,
      icon: <Users className="w-4 h-4" />,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Quản trị viên',
      value: customers.filter((c) => c.role === 'admin').length,
      icon: <Crown className="w-4 h-4" />,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Hoạt động',
      value: customers.filter((c) => c.status === 'active').length,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Đã khóa',
      value: customers.filter((c) => c.status === 'blocked').length,
      icon: <Ban className="w-4 h-4" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title="Quản Lý Tài Khoản"
        description="Toàn bộ tài khoản hệ thống: người dùng & quản trị viên — phân quyền, khóa/mở, quản lý số dư ví"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-[10px] text-pink-300/50 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
        {/* Tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pink-300/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm tên, email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 transition-all"
          />
        </div>

        {/* Filter trạng thái */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-pink-300/40 shrink-0" />
          {(['all', 'active', 'blocked'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); fetchCustomers(1, search, s, roleFilter); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/5 text-pink-200/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {s === 'all' ? 'Tất cả' : s === 'active' ? 'Hoạt động' : 'Đã khóa'}
            </button>
          ))}
        </div>

        {/* Filter quyền */}
        <div className="flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-pink-300/40 shrink-0" />
          {(['all', 'user', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); fetchCustomers(1, search, statusFilter, r); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                roleFilter === r
                  ? r === 'admin'
                    ? 'bg-rose-700 text-white'
                    : 'bg-purple-700 text-white'
                  : 'bg-white/5 text-pink-200/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {r === 'all' ? 'Mọi quyền' : r === 'admin' ? '👑 Admin' : '👤 Người dùng'}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto flex items-center gap-2">
          <span className="text-xs text-pink-300/50">
            Tổng: <strong className="text-white">{total}</strong> tài khoản
          </span>
          <button
            onClick={() => fetchCustomers(page)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bảng tài khoản */}
      <div className="rounded-2xl bg-[#170616]/80 border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                {['Tài Khoản', 'Số Dư', 'Quyền', 'VIP', 'Đơn Mua', 'Tổng Chi Tiêu', 'Trạng Thái', 'Ngày Tạo', 'Thao Tác'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-pink-300/60 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5 animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-white/5 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-pink-300/40">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Không tìm thấy tài khoản nào.</p>
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr
                    key={cust.id}
                    className={`border-b border-white/5 transition-colors hover:bg-white/[0.025] ${
                      cust.role === 'admin' ? 'bg-rose-900/5' : ''
                    }`}
                  >
                    {/* Tài khoản */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 ${
                            cust.role === 'admin'
                              ? 'bg-gradient-to-br from-rose-600 to-red-800 ring-1 ring-rose-500/40'
                              : 'bg-gradient-to-br from-purple-700 to-pink-800'
                          }`}
                        >
                          {cust.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate max-w-[130px]">{cust.username}</div>
                          <div className="text-[10px] text-pink-300/50 truncate max-w-[130px]">{cust.email}</div>
                          {cust.userCode && (
                            <div className="text-[9px] text-amber-400/60 font-mono">#{cust.userCode}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Số dư */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-400">{formatPrice(cust.balance)}</span>
                    </td>

                    {/* Quyền */}
                    <td className="px-4 py-3">
                      <RoleBadge role={cust.role} />
                    </td>

                    {/* VIP */}
                    <td className="px-4 py-3">
                      <VipBadge level={cust.vipLevel} />
                    </td>

                    {/* Đơn mua */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-white">{cust.ordersCount}</span>
                      <span className="text-pink-300/40 ml-1">đơn</span>
                    </td>

                    {/* Tổng chi tiêu */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-black text-rose-400">{formatPrice(cust.totalSpent)}</span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-3">
                      <StatusBadge status={cust.status} />
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-pink-300/50">{cust.createdAt}</span>
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Xem */}
                        <button
                          onClick={() => openDetail(cust.id)}
                          title="Xem hồ sơ"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Nạp tiền */}
                        <button
                          onClick={() => setBalanceAction({ id: cust.id, username: cust.username, balance: cust.balance, type: 'add' })}
                          title="Nạp tiền ví"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-600/20 text-emerald-400/70 hover:text-emerald-300 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Trừ tiền */}
                        <button
                          onClick={() => setBalanceAction({ id: cust.id, username: cust.username, balance: cust.balance, type: 'deduct' })}
                          title="Trừ tiền ví"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-600/20 text-amber-400/70 hover:text-amber-300 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {/* Đổi quyền */}
                        <button
                          onClick={() => handleSetRole(cust.id, cust.username, cust.role)}
                          title={cust.role === 'admin' ? 'Hạ xuống User' : 'Nâng lên Admin'}
                          className={`p-1.5 rounded-lg transition ${
                            cust.role === 'admin'
                              ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 hover:text-rose-300'
                              : 'bg-white/5 text-pink-300/50 hover:bg-purple-600/20 hover:text-purple-300'
                          }`}
                        >
                          {cust.role === 'admin' ? (
                            <ShieldOff className="w-3.5 h-3.5" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Khóa / Mở khóa */}
                        <Popconfirm
                          title={cust.status === 'blocked' ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
                          description={
                            cust.status === 'blocked'
                              ? 'Người dùng sẽ đăng nhập và mua hàng trở lại.'
                              : 'Tài khoản bị khóa sẽ không thể đăng nhập.'
                          }
                          onConfirm={() => handleToggleStatus(cust.id, cust.status)}
                          okText={cust.status === 'blocked' ? 'Mở Khóa' : 'Khóa'}
                          cancelText="Hủy"
                          okButtonProps={{ danger: cust.status !== 'blocked' }}
                        >
                          <button
                            title={cust.status === 'blocked' ? 'Mở khóa' : 'Khóa tài khoản'}
                            className={`p-1.5 rounded-lg transition ${
                              cust.status === 'blocked'
                                ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                                : 'bg-white/5 hover:bg-red-600/20 text-red-400/70 hover:text-red-300'
                            }`}
                          >
                            {cust.status === 'blocked' ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between bg-black/10">
            <span className="text-xs text-pink-300/50">
              Trang {page} / {totalPages} • {total} tài khoản
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => fetchCustomers(page - 1)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => fetchCustomers(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      p === page
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/5 text-pink-200/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => fetchCustomers(page + 1)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DRAWER: Hồ Sơ Chi Tiết ─────────────────────────────────────── */}
      <Drawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setDetail(null); }}
        placement="right"
        width={520}
        closeIcon={<X className="w-5 h-5 text-pink-300 hover:text-white" />}
        styles={{
          body:   { background: '#140613', padding: '1.5rem', color: '#fdf2f8' },
          header: { background: '#190a18', borderBottom: '1px solid rgba(255,255,255,0.08)' },
        }}
        title={
          <span className="text-white font-bold text-sm">
            Hồ Sơ: {detail?.username || '...'}
          </span>
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Avatar + tên + badges */}
            <div className="p-5 rounded-2xl bg-[#1f0c1e] border border-white/5 flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0 ${
                  detail.role === 'admin'
                    ? 'bg-gradient-to-br from-rose-600 to-red-800 ring-2 ring-rose-500/40'
                    : 'bg-gradient-to-br from-purple-700 to-pink-800'
                }`}
              >
                {detail.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">{detail.username}</h3>
                  <StatusBadge status={detail.status} />
                  <RoleBadge role={detail.role} />
                </div>
                <div className="text-xs text-pink-300/60 mt-0.5">{detail.email}</div>
                {detail.userCode && (
                  <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">#{detail.userCode}</div>
                )}
                <div className="mt-1.5">
                  <VipBadge level={detail.vipLevel} />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-pink-300/50 uppercase font-bold tracking-wider">Số Dư Ví</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">{formatPrice(detail.balance)}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-pink-300/50 uppercase font-bold tracking-wider">Tổng Chi Tiêu</div>
                <div className="text-lg font-black text-rose-400 mt-0.5">{formatPrice(detail.totalSpent)}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-pink-300/50 uppercase font-bold tracking-wider">Đơn Hàng</div>
                <div className="text-lg font-black text-white mt-0.5">{detail.ordersCount} đơn</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-pink-300/50 uppercase font-bold tracking-wider">Đăng Nhập Cuối</div>
                <div className="text-xs font-semibold text-white mt-0.5 leading-snug">
                  {detail.lastLoginAt || 'Chưa có dữ liệu'}
                </div>
              </div>
            </div>

            {/* Thông tin */}
            <div className="p-4 rounded-xl bg-[#1b0819] border border-white/5 space-y-2 text-xs">
              <div className="font-bold text-white pb-1.5 border-b border-white/5">Thông Tin Tài Khoản</div>
              <div className="flex items-center gap-2 text-pink-200/80">
                <Mail className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="truncate">{detail.email}</span>
              </div>
              <div className="flex items-center gap-2 text-pink-200/80">
                <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>Ngày tham gia: <strong>{detail.createdAt}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-pink-200/80">
                <Award className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>Cấp bậc: <strong>{detail.vipLevel}</strong></span>
              </div>
            </div>

            {/* Thao tác nhanh */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBalanceAction({ id: detail.id, username: detail.username, balance: detail.balance, type: 'add' })}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition border border-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Nạp Tiền
              </button>
              <button
                onClick={() => setBalanceAction({ id: detail.id, username: detail.username, balance: detail.balance, type: 'deduct' })}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold transition border border-amber-500/20"
              >
                <Minus className="w-3.5 h-3.5" /> Trừ Tiền
              </button>
              <button
                onClick={() => handleSetRole(detail.id, detail.username, detail.role)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition border ${
                  detail.role === 'admin'
                    ? 'bg-zinc-700/40 hover:bg-zinc-700/60 text-zinc-300 border-white/10'
                    : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/20'
                }`}
              >
                {detail.role === 'admin' ? (
                  <><ShieldOff className="w-3.5 h-3.5" /> Hạ Xuống User</>
                ) : (
                  <><Shield className="w-3.5 h-3.5" /> Cấp Quyền Admin</>
                )}
              </button>
              <Popconfirm
                title={detail.status === 'blocked' ? 'Mở khóa?' : 'Khóa tài khoản?'}
                onConfirm={() => handleToggleStatus(detail.id, detail.status)}
                okText={detail.status === 'blocked' ? 'Mở Khóa' : 'Khóa'}
                cancelText="Hủy"
                okButtonProps={{ danger: detail.status !== 'blocked' }}
              >
                <button
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition border ${
                    detail.status === 'blocked'
                      ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/20'
                      : 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/20'
                  }`}
                >
                  {detail.status === 'blocked' ? (
                    <><UserCheck className="w-3.5 h-3.5" /> Mở Khóa TK</>
                  ) : (
                    <><Ban className="w-3.5 h-3.5" /> Khóa Tài Khoản</>
                  )}
                </button>
              </Popconfirm>
            </div>

            {/* Tabs đơn hàng & giao dịch */}
            <Tabs
              defaultActiveKey="orders"
              size="small"
              items={[
                {
                  key: 'orders',
                  label: (
                    <span className="flex items-center gap-1.5 text-xs">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Nick Đã Mua ({detail.orders.length})
                    </span>
                  ),
                  children: (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {detail.orders.length === 0 ? (
                        <div className="py-8 text-center text-xs text-pink-300/40">Chưa có đơn hàng nào</div>
                      ) : (
                        detail.orders.map((ord) => (
                          <div key={ord.id} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs gap-3">
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-rose-300">{ord.code}</div>
                              <div className="text-[10px] text-pink-200/60 mt-0.5 truncate">{ord.accountTitle} • {ord.gameName}</div>
                              <div className="text-[9px] text-pink-300/40 mt-0.5">{ord.createdAt}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-white">{formatPrice(ord.amount)}</div>
                              <StatusBadge status={ord.status} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  key: 'transactions',
                  label: (
                    <span className="flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-3.5 h-3.5" />
                      Giao Dịch ({detail.transactions.length})
                    </span>
                  ),
                  children: (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {detail.transactions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-pink-300/40">Chưa có giao dịch nào</div>
                      ) : (
                        detail.transactions.map((tx) => (
                          <div key={tx.id} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs gap-3">
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-pink-300">{tx.code}</div>
                              <div className="text-[10px] text-pink-200/60 mt-0.5 truncate max-w-[200px]">{tx.content}</div>
                              <div className="text-[9px] text-pink-300/40 mt-0.5">{tx.time}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{formatPrice(Math.abs(tx.amount))}
                              </div>
                              <div className="text-[9px] text-pink-300/40">{tx.gateway}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Drawer>

      {/* ── MODAL: Nạp / Trừ Tiền ───────────────────────────────────────── */}
      {balanceAction && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1a0818] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-rose-900/30 to-purple-900/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {balanceAction.type === 'add' ? (
                    <><Plus className="w-4 h-4 text-emerald-400" /> Nạp Tiền Thủ Công</>
                  ) : (
                    <><Minus className="w-4 h-4 text-amber-400" /> Trừ Tiền Thủ Công</>
                  )}
                </h3>
                <p className="text-xs text-pink-300/60 mt-0.5">
                  Tài khoản: <strong className="text-white">{balanceAction.username}</strong>{' '}
                  • Số dư: <strong className="text-emerald-400">{formatPrice(balanceAction.balance)}</strong>
                </p>
              </div>
              <button
                onClick={() => { setBalanceAction(null); setBalanceAmount(''); }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200/50 hover:text-white transition text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Input số tiền */}
              <div>
                <label className="text-[11px] text-pink-300/60 font-medium block mb-1.5">Số tiền (VNĐ)</label>
                <input
                  type="text"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Nhập số tiền..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-pink-300/30 focus:outline-none focus:border-rose-500/50 transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleBalanceAction()}
                />
                {balanceAmount && (
                  <div className="text-xs text-pink-300/60 mt-1">
                    = <strong className="text-white">{formatPrice(Number(balanceAmount))}</strong>
                  </div>
                )}
              </div>

              {/* Preset */}
              <div className="flex flex-wrap gap-1.5">
                {[10_000, 50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBalanceAmount(String(amt))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-pink-200/70 hover:text-white transition border border-white/5"
                  >
                    {amt >= 1_000_000 ? `${amt / 1_000_000}tr` : `${amt / 1_000}k`}
                  </button>
                ))}
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setBalanceAction(null); setBalanceAmount(''); }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200/60 hover:text-white text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBalanceAction}
                  disabled={balanceLoading || !balanceAmount}
                  className={`flex-1 py-2 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                    balanceAction.type === 'add'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                  }`}
                >
                  {balanceLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : balanceAction.type === 'add' ? (
                    <><Wallet className="w-3.5 h-3.5" /> Xác Nhận Nạp</>
                  ) : (
                    <><TrendingUp className="w-3.5 h-3.5" /> Xác Nhận Trừ</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

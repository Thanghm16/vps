'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AdminOrder, OrderStatus } from '@/types/admin';
import { formatPrice } from '@/lib/utils';
import StatusBadge from '@/components/admin/common/StatusBadge';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import OrderDetailDrawer from '@/components/admin/orders/OrderDetailDrawer';
import { Search, Eye } from 'lucide-react';
import { Table, Input, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = useCallback(async (
    targetPage = 1,
    targetStatus = activeTab,
    targetSearch = searchQuery
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));
      if (targetStatus !== 'all') params.set('status', targetStatus);
      if (targetSearch.trim()) params.set('search', targetSearch.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setTotalCount(data.total || 0);
        setPage(data.page || targetPage);
      }
    } catch (e) {
      console.warn('Fetch orders failed:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, pageSize]);

  useEffect(() => {
    fetchOrders(1, activeTab, searchQuery);
  }, [activeTab, searchQuery, fetchOrders]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const columns: ColumnsType<AdminOrder> = [
    {
      title: 'MÃ ĐƠN HÀNG',
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
      title: 'NICK ĐÃ MUA',
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
      title: 'TỔNG TIỀN',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-black text-white text-xs">{formatPrice(amount)}</span>
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
      key: 'actions',
      render: (_, record) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(record)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white transition"
          title="Xem chi tiết đơn"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'Tất Cả Đơn' },
    { key: 'delivered', label: 'Đã Giao Nick' },
    { key: 'paid', label: 'Đã Thanh Toán' },
    { key: 'processing', label: 'Đang Xử Lý' },
    { key: 'pending', label: 'Chờ Thanh Toán' },
    { key: 'cancelled', label: 'Đã Hủy' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <AdminPageHeader
        title="Quản Lý Đơn Hàng"
        description="Theo dõi, bàn giao thông tin đăng nhập và xử lý đơn hàng tự động"
      />

      {/* FILTER TABS & SEARCH */}
      <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="custom-admin-tabs"
        />

        <div className="w-full md:w-64">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Mã đơn, tên, SĐT, mã nick..."
            prefix={<Search className="w-3.5 h-3.5 text-pink-300/40 mr-1" />}
            allowClear
            className="rounded-xl bg-black/30 border-white/10 text-xs text-white"
          />
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 text-xs text-pink-200/60 font-medium">
          <span>Tìm thấy <strong>{totalCount}</strong> đơn hàng</span>
          <span className="text-[11px] text-pink-300/40">Hệ thống bàn giao tự động 24/7 qua SePay</span>
        </div>

        <div className="overflow-x-auto">
          <Table
            loading={loading}
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: totalCount,
              onChange: (p) => {
                setPage(p);
                fetchOrders(p, activeTab, searchQuery);
              },
              showSizeChanger: false,
              className: 'custom-admin-pagination',
            }}
          />
        </div>
      </div>

      {/* ORDER DETAIL DRAWER */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}

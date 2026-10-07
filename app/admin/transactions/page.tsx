'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AdminTransaction } from '@/types/admin';
import { formatPrice } from '@/lib/utils';
import StatusBadge from '@/components/admin/common/StatusBadge';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import { Search, ArrowDownLeft } from 'lucide-react';
import { Table, Input, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalCount, setTotalCount] = useState(0);

  const fetchTransactions = useCallback(async (
    targetPage = 1,
    method = selectedMethod,
    status = selectedStatus,
    search = searchQuery
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));
      if (method !== 'all') params.set('paymentMethod', method);
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setTotalCount(data.total || 0);
        setPage(data.page || targetPage);
      }
    } catch (e) {
      console.warn('Fetch transactions failed:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMethod, selectedStatus, searchQuery, pageSize]);

  useEffect(() => {
    fetchTransactions(1, selectedMethod, selectedStatus, searchQuery);
  }, [selectedMethod, selectedStatus, searchQuery, fetchTransactions]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleMethodChange = (val: string) => {
    setSelectedMethod(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setPage(1);
  };

  const columns: ColumnsType<AdminTransaction> = [
    {
      title: 'MÃ GIAO DỊCH',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <span className="font-mono font-bold text-rose-400 text-xs">{code}</span>
      ),
    },
    {
      title: 'MÃ ĐƠN HÀNG',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (orderCode: string) => (
        <span className="font-mono font-semibold text-pink-200 text-xs">
          {orderCode || 'Nạp ví tài khoản'}
        </span>
      ),
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => (
        <span className="font-bold text-white text-xs">{name}</span>
      ),
    },
    {
      title: 'SỐ TIỀN',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <div className="flex items-center gap-1">
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-black text-emerald-400 text-xs">+{formatPrice(amount)}</span>
        </div>
      ),
    },
    {
      title: 'CỔNG THANH TOÁN',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string, record) => (
        <div>
          <span className="uppercase text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 text-pink-200 border border-white/5">
            {method}
          </span>
          {record.bankReference && (
            <div className="text-[10px] text-pink-300/40 font-mono mt-0.5 truncate max-w-[140px]">
              {record.bankReference}
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
      title: 'THỜI GIAN',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => (
        <span className="text-[11px] text-pink-300/60 whitespace-nowrap">{time}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <AdminPageHeader
        title="Lịch Sử Giao Dịch & Nạp Tiền"
        description="Nhật ký các giao dịch nạp tiền qua VietQR SePay, Ví điện tử và số dư ví tự động"
      />

      {/* FILTER BAR */}
      <div className="p-4 rounded-2xl bg-[#170616]/80 border border-white/5 shadow-md flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm mã GD, mã đơn, khách hàng, mã ngân hàng..."
            prefix={<Search className="w-3.5 h-3.5 text-pink-300/40 mr-1" />}
            allowClear
            className="rounded-xl bg-black/30 border-white/10 text-xs text-white"
          />
        </div>

        <Select
          value={selectedMethod}
          onChange={handleMethodChange}
          className="w-36"
          options={[
            { value: 'all', label: 'Tất cả cổng' },
            { value: 'vietqr', label: 'VietQR 24/7' },
            { value: 'wallet', label: 'Ví số dư' },
            { value: 'momo', label: 'Ví MoMo' },
            { value: 'zalopay', label: 'ZaloPay' },
          ]}
        />

        <Select
          value={selectedStatus}
          onChange={handleStatusChange}
          className="w-36"
          options={[
            { value: 'all', label: 'Tất cả trạng thái' },
            { value: 'success', label: 'Thành công' },
            { value: 'pending', label: 'Chờ đối soát' },
            { value: 'failed', label: 'Thất bại' },
          ]}
        />
      </div>

      {/* TABLE */}
      <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 text-xs text-pink-200/60 font-medium">
          <span>Tìm thấy <strong>{totalCount}</strong> giao dịch</span>
          <span className="text-[11px] text-pink-300/40">Tự động đồng bộ từ SePay Webhook</span>
        </div>

        <div className="overflow-x-auto">
          <Table
            loading={loading}
            columns={columns}
            dataSource={transactions}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: totalCount,
              onChange: (p) => {
                setPage(p);
                fetchTransactions(p, selectedMethod, selectedStatus, searchQuery);
              },
              showSizeChanger: false,
              className: 'custom-admin-pagination',
            }}
          />
        </div>
      </div>
    </div>
  );
}

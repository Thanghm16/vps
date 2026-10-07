'use client';

import React, { useState, useEffect, use } from 'react';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import LuckyWheelForm from '@/components/admin/lucky-wheel/LuckyWheelForm';
import { App, Spin } from 'antd';
import { Gift } from 'lucide-react';

export default function EditLuckyWheelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { message } = App.useApp();
  const [wheel, setWheel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWheel() {
      try {
        const res = await fetch(`/api/admin/lucky-wheel/${id}`);
        const data = await res.json();
        if (data.success && data.wheel) {
          setWheel(data.wheel);
        } else {
          message.error(data.message || 'Không tìm thấy vòng quay');
        }
      } catch {
        message.error('Lỗi khi tải thông tin vòng quay');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchWheel();
    }
  }, [id, message]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Spin size="large" />
        <span className="text-xs text-pink-300/60 font-semibold">Đang tải thông tin vòng quay...</span>
      </div>
    );
  }

  if (!wheel) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center p-6">
        <Gift className="w-12 h-12 text-rose-500/40" />
        <h3 className="text-base font-bold text-white">Không tìm thấy vòng quay</h3>
        <p className="text-xs text-pink-300/60">Vòng quay này có thể đã bị xóa hoặc đường dẫn không hợp lệ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title={`Chỉnh Sửa: ${wheel.name}`}
        description="Cập nhật thông tin chi tiết, cơ cấu giải thưởng, xác suất trúng và thể lệ chương trình."
      />

      <LuckyWheelForm
        isEdit
        wheelId={id}
        initialValues={wheel}
      />
    </div>
  );
}

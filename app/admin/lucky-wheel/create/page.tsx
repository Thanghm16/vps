'use client';

import React from 'react';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import LuckyWheelForm from '@/components/admin/lucky-wheel/LuckyWheelForm';

export default function CreateLuckyWheelPage() {
  const initialDefaultRewards = [
    {
      id: 'rew_1',
      name: 'Chúc bạn may mắn lần sau',
      type: 'NOTHING',
      value: 0,
      quantity: -1,
      remainingQuantity: -1,
      probability: 50,
      color: '#1e1b4b',
      textColor: '#ffffff',
      enabled: true,
      sortOrder: 0,
    },
    {
      id: 'rew_2',
      name: 'Thêm 1 lượt quay miễn phí',
      type: 'EXTRA_SPIN',
      value: 1,
      quantity: -1,
      remainingQuantity: -1,
      probability: 25,
      color: '#059669',
      textColor: '#ffffff',
      enabled: true,
      sortOrder: 1,
    },
    {
      id: 'rew_3',
      name: 'Voucher giảm giá 10%',
      type: 'COUPON',
      value: 10,
      quantity: -1,
      remainingQuantity: -1,
      probability: 15,
      color: '#9333ea',
      textColor: '#ffffff',
      enabled: true,
      sortOrder: 2,
      metadata: { couponDiscountPercent: 10 },
    },
    {
      id: 'rew_4',
      name: 'Thưởng 20.000 VNĐ vào ví',
      type: 'MONEY',
      value: 20000,
      quantity: 100,
      remainingQuantity: 100,
      probability: 9,
      color: '#d97706',
      textColor: '#ffffff',
      enabled: true,
      sortOrder: 3,
    },
    {
      id: 'rew_5',
      name: 'Nick Game VIP Cực Phẩm',
      type: 'ACCOUNT',
      value: 1,
      quantity: 5,
      remainingQuantity: 5,
      probability: 1,
      color: '#e11d48',
      textColor: '#ffffff',
      enabled: true,
      sortOrder: 4,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title="Tạo Vòng Quay May Mắn Mới"
        description="Thiết lập vòng quay may mắn, cấu hình giải thưởng, chi phí lượt quay và tỷ lệ xác suất."
      />

      <LuckyWheelForm
        initialValues={{
          name: '',
          slug: '',
          description: '',
          spinCost: 10000,
          freeSpinsPerUser: 1,
          status: 'draft',
          requireLogin: true,
          enabled: true,
          rewards: initialDefaultRewards,
        }}
      />
    </div>
  );
}

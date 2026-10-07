'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer } from 'antd';
import { ShieldAlert } from 'lucide-react';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import AdminHeader from '@/components/admin/layout/AdminHeader';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Chưa đăng nhập -> Chuyển đến trang login
        router.replace('/login?redirect=/admin');
      } else if (!isAdmin) {
        // Tài khoản thường -> LẬP TỨC ĐẨY VỀ TRANG CHỦ NGƯỜI DÙNG, CẤM DÙNG ADMIN
        router.replace('/?error=unauthorized_admin');
      }
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // Ngăn chặn hiển thị toàn bộ giao diện Admin nếu chưa xác thực quyền Admin
  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0309] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 animate-pulse">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <p className="text-sm font-semibold text-rose-200/70 tracking-wide">
          Đang kiểm tra quyền quản trị viên...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0309] text-white flex">
      {/* DESKTOP SIDEBAR (Cố định bên trái) */}
      <div className="hidden lg:block flex-shrink-0">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* MOBILE DRAWER SIDEBAR */}
      <Drawer
        placement="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        size={260}
        styles={{
          body: {
            padding: 0,
            background: '#120511',
          },
          header: {
            display: 'none',
          },
        }}
        className="lg:hidden"
      >
        <AdminSidebar
          collapsed={false}
          onToggleCollapse={() => {}}
          onNavigateMobile={() => setMobileDrawerOpen(false)}
        />
      </Drawer>

      {/* RIGHT MAIN AREA: Header + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onOpenMobileMenu={() => setMobileDrawerOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gradient-to-b from-[#0c040b] via-[#0e040d] to-[#0a0309]">
          <div className="w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

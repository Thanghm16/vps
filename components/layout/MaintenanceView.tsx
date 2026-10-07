'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2, ShieldAlert, PhoneCall, MessageCircle, Mail, Lock, RefreshCw } from 'lucide-react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { useAuth } from '@/components/auth/AuthProvider';

export default function MaintenanceView() {
  const { settings, refreshSettings } = useSettings();
  const { user, isAdmin } = useAuth();

  const brandName = settings.brandName || 'Game STORE';
  const logoUrl = settings.logo?.url;
  const message =
    settings.maintenance?.message ||
    'Hệ thống đang được nâng cấp bảo trì định kỳ để nâng cao chất lượng dịch vụ. Vui lòng quay lại sau ít phút!';

  return (
    <div className="min-h-screen bg-[#0c040b] text-white flex flex-col items-center justify-between p-6 relative overflow-hidden selection:bg-rose-600">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Brand */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative h-10 w-36">
              <Image src={logoUrl} alt={brandName} fill className="object-contain object-left" sizes="150px" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-lg leading-tight tracking-tight">{brandName}</span>
                <span className="text-[10px] text-pink-300/60 font-semibold tracking-widest uppercase">
                  Marketplace VIP
                </span>
              </div>
            </div>
          )}
        </div>

        {isAdmin ? (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Vào Admin Panel</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs text-pink-300/60 hover:text-white transition font-medium"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Dành cho Quản trị viên</span>
          </Link>
        )}
      </div>

      {/* Main Maintenance Card */}
      <div className="max-w-xl w-full my-auto text-center p-8 sm:p-10 rounded-3xl bg-[#190918]/80 border border-rose-500/20 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Animated Maintenance Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-rose-600/30 to-purple-600/30 animate-pulse blur-md" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-700 flex items-center justify-center shadow-xl shadow-rose-600/40 ring-2 ring-white/20">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Hệ Thống Đang Nâng Cấp Bảo Trì</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
          Chúng tôi sẽ trở lại sớm!
        </h1>

        <p className="text-sm text-pink-200/70 leading-relaxed mb-8 whitespace-pre-line">
          {message}
        </p>

        {/* Action Button: Reload check */}
        <button
          onClick={() => refreshSettings()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-700 hover:from-rose-500 hover:to-purple-600 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-rose-900/40 hover:scale-105 active:scale-95 cursor-pointer mb-8"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Kiểm Tra Trạng Thái Lại</span>
        </button>

        {/* Contact info for urgent inquiries */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-around gap-4 text-xs text-pink-200/60">
          {settings.contact?.phone && (
            <a
              href={`tel:${settings.contact.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span>Hotline: <strong className="text-white">{settings.contact.phone}</strong></span>
            </a>
          )}
          {settings.contact?.zalo && (
            <a
              href={`https://zalo.me/${settings.contact.zalo.replace(/\s/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Zalo: <strong className="text-white">{settings.contact.zalo}</strong></span>
            </a>
          )}
          {settings.contact?.email && (
            <a
              href={`mailto:${settings.contact.email}`}
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              <span>{settings.contact.email}</span>
            </a>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-pink-300/40 pb-2">
        {settings.footer?.copyright || '© 2026 GameStore.vn. All rights reserved.'}
      </div>
    </div>
  );
}

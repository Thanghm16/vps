'use client';

import React from 'react';
import { Modal } from 'antd';
import {
  Headphones,
  PhoneCall,
  MessageCircle,
  Mail,
  Send,
  Clock,
  ShieldCheck,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useSettings } from '@/components/settings/SettingsProvider';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SupportModal({ open, onClose }: SupportModalProps) {
  const { settings } = useSettings();

  const phone = settings.contact?.phone || '1900 8888';
  const zalo = settings.contact?.zalo || '0988.888.999';
  const email = settings.contact?.email || 'hotro@gamestore.vn';
  const telegram = settings.social?.telegram || 'https://t.me';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      className="custom-admin-modal"
      title={
        <div className="flex items-center gap-2.5 text-white text-base font-bold pb-2 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Headphones className="w-4 h-4" />
          </div>
          <span>Trung Tâm Hỗ Trợ Khách Hàng 24/7</span>
        </div>
      }
    >
      <div className="pt-3 pb-2 space-y-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-rose-950/30 to-[#190817] border border-purple-500/20 text-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-white">Đội Ngũ CSKH Túc Trực 24/7</div>
            <div className="text-[11px] text-pink-200/60 mt-0.5">
              Phản hồi giải đáp thắc mắc và hỗ trợ giao dịch trong vòng <strong>dưới 60 giây</strong>.
            </div>
          </div>
        </div>

        {/* Contact Channels Grid */}
        <div className="space-y-2.5">
          {/* Hotline */}
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c081a]/80 hover:bg-emerald-950/30 border border-white/5 hover:border-emerald-500/30 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-pink-200/60 block">Hotline Trực Tiếp</span>
                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  {phone}
                </span>
              </div>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold group-hover:bg-emerald-600 group-hover:text-white transition">
              Gọi Ngay
            </span>
          </a>

          {/* Zalo */}
          <a
            href={zalo.startsWith('http') ? zalo : `https://zalo.me/${zalo.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c081a]/80 hover:bg-rose-950/30 border border-white/5 hover:border-rose-500/30 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-pink-200/60 block">Hỗ Trợ Zalo Kỹ Thuật</span>
                <span className="text-sm font-bold text-white group-hover:text-rose-300 transition">
                  {zalo}
                </span>
              </div>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 font-bold group-hover:bg-rose-600 group-hover:text-white transition flex items-center gap-1">
              <span>Chat Zalo</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          {/* Telegram */}
          {telegram && (
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c081a]/80 hover:bg-blue-950/30 border border-white/5 hover:border-blue-500/30 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-pink-200/60 block">Kênh Telegram Thông Báo</span>
                  <span className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                    Telegram Channel
                  </span>
                </div>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold group-hover:bg-blue-600 group-hover:text-white transition flex items-center gap-1">
                <span>Tham Gia</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          )}

          {/* Email */}
          <a
            href={`mailto:${email}`}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c081a]/80 hover:bg-purple-950/30 border border-white/5 hover:border-purple-500/30 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-pink-200/60 block">Hòm Thư Khiếu Nại</span>
                <span className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate max-w-[200px] block">
                  {email}
                </span>
              </div>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 font-bold group-hover:bg-purple-600 group-hover:text-white transition">
              Gửi Mail
            </span>
          </a>
        </div>

        {/* Footer Guarantees */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-pink-300/50">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bảo hành 1-1</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Tự động 24/7</span>
          </div>
          <div className="flex items-center gap-1 text-purple-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Hỗ trợ thần tốc</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

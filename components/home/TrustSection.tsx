import React from 'react';
import { ShieldCheck, Zap, Headphones, RefreshCw } from 'lucide-react';

export default function TrustSection() {
  const benefits = [
    {
      icon: Zap,
      title: 'Giao Nick Tự Động 24/7',
      description: 'Nhận tài khoản trong 30 giây.',
      color: 'from-amber-500/20 to-rose-500/20 text-amber-400',
    },
    {
      icon: ShieldCheck,
      title: '100% Thông Tin Sạch',
      description: 'Tài khoản sạch, cam kết chính chủ, đổi được mọi thông tin liên kết.',
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    },
    {
      icon: RefreshCw,
      title: 'Chính Sách Bảo Hành',
      description: 'Hỗ trợ 1 đổi 1 trong lúc bên shop đang giữ acc.',
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    },
    {
      icon: Headphones,
      title: 'CSKH Trực Tuyến 24/7',
      description: 'Đội ngũ hỗ trợ viên tận tình giải đáp qua Zalo.',
      color: 'from-rose-500/20 to-red-500/20 text-rose-400',
    },
  ];

  return (
    <div className="w-full mt-10 pt-8 border-t border-white/5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#180917]/50 border border-white/5 flex items-start gap-3.5 hover:border-rose-500/20 transition group"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {item.title}
                </h4>
                <p className="text-[11px] text-pink-200/60 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

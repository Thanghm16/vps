import React from 'react';
import { ShieldCheck, Zap, Users, Award } from 'lucide-react';

export default function MarketplaceStats() {
  const stats = [
    {
      icon: Users,
      value: '48.500+',
      label: 'Khách Hàng Tin Dùng',
      desc: 'Hơn 48 nghìn game thủ đã mua nick an toàn',
      color: 'from-rose-500 to-pink-500',
    },
    {
      icon: ShieldCheck,
      value: '99.8%',
      label: 'Tỉ Lệ Hài Lòng',
      desc: 'Cam kết 100% tài khoản thông tin đẹp có thể đổi được',
      color: 'from-emerald-500 to-teal-400',
    },
    {
      icon: Zap,
      value: '30 Giây',
      label: 'Giao Dịch Tự Động',
      desc: 'Hệ thống gửi mật khẩu tức thì 24/7',
      color: 'from-amber-400 to-yellow-500',
    },
    {
      icon: Award,
      value: '100%',
      label: 'Bảo Hành Đổi Trả',
      desc: 'Bảo hành 1 đổi 1 nếu acc không đúng như mô tả',
      color: 'from-purple-500 to-indigo-400',
    },
  ];

  return (
    <section className="w-full my-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#1a0a18]/70 border border-white/5 hover:border-white/15 transition-all duration-300 shadow-xl group hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-tr ${item.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-pink-300/40 uppercase tracking-widest font-mono">
                  VERIFIED
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {item.value}
              </div>
              <div className="text-xs sm:text-sm font-bold text-pink-200 mt-0.5">
                {item.label}
              </div>
              <div className="text-[11px] text-pink-300/50 mt-1 leading-relaxed">
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import React from 'react';
import { Search, CreditCard, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: Search,
      title: 'Chọn Nick & Soi Kho Đồ',
      desc: 'Tìm kiếm theo game, rank, skin hoặc mã số. Dùng tính năng phóng to để kiểm tra chi tiết bảng ngọc và tướng.',
      badge: 'Minh Bạch',
    },
    {
      step: '02',
      icon: CreditCard,
      title: 'Thanh Toán Bảo Mật 24/7',
      desc: 'Thanh toán tức thì qua Ví số dư hoặc quét mã VietQR tự động. Hệ thống xử lý giao dịch không cần chờ duyệt.',
      badge: 'Tự Động',
    },
    {
      step: '03',
      icon: KeyRound,
      title: 'Nhận Nick & Đổi Thông Tin',
      desc: 'Hệ thống gửi tài khoản và mật khẩu ngay sau 30 giây. Hướng dẫn đổi thông tin số điện thoại & email chính chủ.',
      badge: 'Tức Thì',
    },
  ];

  return (
    <section className="w-full my-8 p-6 sm:p-8 rounded-[30px] bg-[#180917]/70 border border-white/5 shadow-xl relative">
      {/* Title */}
      <div className="flex flex-col items-center text-center max-w-xl mx-auto mb-8">
        <span className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1 mb-1">
          <ShieldCheck className="w-4 h-4" />
          Quy Trình Giao Dịch
        </span>
        <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
          3 Bước Mua Nick Đơn Giản & An Toàn
        </h2>
        <p className="text-xs sm:text-sm text-pink-200/60 mt-1">
          Tối ưu trải nghiệm cho game thủ, nhận tài khoản chỉ sau 30 giây thanh toán
        </p>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="relative p-6 rounded-2xl bg-[#200d1f]/60 hover:bg-[#280f27] border border-white/5 hover:border-rose-500/30 transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Step number watermark */}
              <span className="absolute top-3 right-4 text-4xl font-black text-white/5 font-mono group-hover:text-rose-500/10 transition">
                {item.step}
              </span>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#34122d] text-pink-300 border border-white/5">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition">
                  {item.title}
                </h3>
                <p className="text-xs text-pink-200/60 mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {idx < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#180917] border border-white/10 items-center justify-center text-pink-300/40">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

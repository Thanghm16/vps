'use client';

import React from 'react';
import { ShieldCheck, Info, Gift, Award, Clock, HelpCircle } from 'lucide-react';
import { LuckyWheelClientData } from '@/types/lucky-wheel';

interface WheelRulesCardProps {
  wheel: LuckyWheelClientData;
}

export default function WheelRulesCard({ wheel }: WheelRulesCardProps) {
  return (
    <div className="rounded-3xl bg-[#180718]/90 border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-white">Thể Lệ & Cơ Cấu Giải Thưởng</h3>
          <p className="text-xs text-pink-300/60">Quy định và thông tin chi tiết chương trình</p>
        </div>
      </div>

      {/* Thông tin quy định chung */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <Gift className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] text-pink-300/60 block">Lượt miễn phí ban đầu</span>
            <span className="text-xs font-bold text-white">
              {wheel.freeSpinsPerUser > 0 ? `${wheel.freeSpinsPerUser} lượt / tài khoản` : 'Không có'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] text-pink-300/60 block">Giới hạn trong ngày</span>
            <span className="text-xs font-bold text-white">
              {wheel.dailySpinLimit ? `${wheel.dailySpinLimit} lượt quay / ngày` : 'Không giới hạn'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] text-pink-300/60 block">Chi phí mỗi lượt quay</span>
            <span className="text-xs font-bold text-white">
              {wheel.spinCost > 0 ? `${wheel.spinCost.toLocaleString('vi-VN')} ₫ / lượt` : 'Miễn phí'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] text-pink-300/60 block">Thời gian sự kiện</span>
            <span className="text-xs font-bold text-white">
              {wheel.endAt ? `Đến ${new Date(wheel.endAt).toLocaleDateString('vi-VN')}` : 'Vô thời hạn'}
            </span>
          </div>
        </div>
      </div>

      {/* Nội dung quy tắc tuỳ chỉnh */}
      {wheel.rules ? (
        <div className="prose prose-invert prose-pink max-w-none text-xs text-pink-100/80 space-y-2 whitespace-pre-line leading-relaxed">
          {wheel.rules}
        </div>
      ) : (
        <ul className="space-y-2 text-xs text-pink-200/70 list-disc list-inside leading-relaxed">
          <li>Mỗi tài khoản được nhận lượt quay miễn phí khi tham gia sự kiện.</li>
          <li>Khi hết lượt miễn phí, người chơi có thể sử dụng số dư ví để tiếp tục quay.</li>
          <li>Phần thưởng tài khoản game sẽ được bàn giao trực tiếp vào mục Đơn hàng.</li>
          <li>Phần thưởng tiền mặt sẽ được cộng trực tiếp vào số dư tài khoản.</li>
          <li>Mã giảm giá có hiệu lực trong vòng 30 ngày kể từ lúc trúng thưởng.</li>
          <li>Nghiêm cấm mọi hành vi can thiệp hoặc gian lận kết quả quay thưởng.</li>
        </ul>
      )}
    </div>
  );
}

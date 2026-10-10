'use client';

import React from 'react';
import { Collapse } from 'antd';
import { HelpCircle, ChevronDown } from 'lucide-react';

export default function FaqSection() {
  const faqItems = [
    {
      key: '1',
      label: (
        <span className="text-xs sm:text-sm font-bold text-white">
          Sau khi thanh toán, tôi nhận thông tin tài khoản bằng cách nào?
        </span>
      ),
      children: (
        <p className="text-xs sm:text-sm text-pink-200/70 leading-relaxed">
          Hệ thống hoạt động hoàn toàn tự động 24/7. Ngay sau khi thanh toán thành công, thông tin tài khoản (Tên đăng nhập, Mật khẩu và mã bảo mật) sẽ hiển thị ngay trên màn hình đơn hàng, đồng thời gửi một bản sao đến hòm thư và mục Lịch Sử Giao Dịch của bạn.
        </p>
      ),
    },
    {
      key: '2',
      label: (
        <span className="text-xs sm:text-sm font-bold text-white">
          Chính sách bảo hành tài khoản hoạt động như thế nào?
        </span>
      ),
      children: (
        <p className="text-xs sm:text-sm text-pink-200/70 leading-relaxed">
          Tất cả tài khoản bán ra trên sàn đều được bảo hành 1 đổi 1 nếu  thông tin không trùng khớp với ảnh chụp kho đồ. Đội ngũ hỗ trợ kỹ thuật trực tuyến 24/7.
        </p>
      ),
    },
    {
      key: '3',
      label: (
        <span className="text-xs sm:text-sm font-bold text-white">
          Tôi có thể đổi số điện thoại và email cá nhân sau khi mua không?
        </span>
      ),
      children: (
        <p className="text-xs sm:text-sm text-pink-200/70 leading-relaxed">
          Được 100%. Các tài khoản trên sàn đều ở trạng thái thông tin sạch đảm bảo đổi được(Garena trắng thông tin-số đổi-giaomail ...vv, Google ). Sau khi nhận nick, bạn có thể vào trang quản lý chính thức của game để liên kết số điện thoại và email cá nhân của mình. Đối với tài khoản giao mail hoặc đổi số điện thoại thì sai khi mua liên hệ Admin để hỗ trợ thay thông tin
        </p>
      ),
    },
    {
      key: '4',
      label: (
        <span className="text-xs sm:text-sm font-bold text-white">
          Sàn hỗ trợ những phương thức thanh toán nào?
        </span>
      ),
      children: (
        <p className="text-xs sm:text-sm text-pink-200/70 leading-relaxed">
          Chúng tôi hỗ trợ thanh toán qua số dư Ví tài khoản, quét mã VietQR tự động của tất cả các ngân hàng tại Việt Nam (xử lý sau 5 giây), ví điện tử MoMo, ZaloPay.
        </p>
      ),
    },
  ];

  return (
    <section className="w-full my-8 p-6 sm:p-8 rounded-[30px] bg-[#190918]/70 border border-white/5 shadow-xl">
      <div className="flex flex-col items-center text-center max-w-xl mx-auto mb-6">
        <span className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1 mb-1">
          <HelpCircle className="w-4 h-4" />
          Giải Đáp Thắc Mắc
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Câu Hỏi Thường Gặp (FAQ)
        </h2>
        <p className="text-xs text-pink-200/60 mt-1">
          Những câu hỏi phổ biến nhất của người mua nick lần đầu tại manhthang.shop
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <Collapse
          items={faqItems}
          bordered={false}
          defaultActiveKey={['1']}
          expandIcon={({ isActive }) => (
            <ChevronDown
              className={`w-4 h-4 text-pink-300 transition-transform duration-300 ${
                isActive ? 'rotate-180 text-rose-400' : ''
              }`}
            />
          )}
          style={{
            background: 'transparent',
          }}
        />
      </div>
    </section>
  );
}

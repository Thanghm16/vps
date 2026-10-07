'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameAccount } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  ShieldCheck,
  Heart,
  Zap,
  CheckCircle2,
  Key,
  RefreshCw,
  FileText,
  AlertCircle,
  Share2,
  ZoomIn,
  Sparkles,
  Tag,
  Flame,
  Check,
  Star,
  Gift,
  PhoneCall,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Award,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Tabs, App, Image as AntdImage, Collapse } from 'antd';
import QuickBuyModal from '@/components/account/QuickBuyModal';
import AccountCard from '@/components/account/AccountCard';
import { useFavorites } from '@/components/favorites/FavoritesProvider';

interface Props {
  account: GameAccount;
  relatedAccounts: GameAccount[];
}

/**
 * Trích xuất danh sách tất cả thuộc tính thực tế của nick (từ details và root props)
 * LOẠI BỎ các thuộc tính rỗng, null, undefined, hoặc các key nội bộ
 */
function extractAccountAttributes(account: GameAccount): { key: string; value: string }[] {
  const attrs: { key: string; value: string }[] = [];
  const seenKeys = new Set<string>();

  const internalKeys = new Set([
    '_id',
    'id',
    'code',
    'gameId',
    'gameSlug',
    'gameName',
    'title',
    'slug',
    'thumbnail',
    'images',
    'price',
    'originalPrice',
    'discountPercent',
    'status',
    'isVerified',
    'isFeatured',
    'isHot',
    'views',
    'rating',
    'reviewCount',
    'salesCount',
    'reviewsCount',
    'credentials',
    'createdAt',
    'updatedAt',
    'tags',
    'highlights',
    'featuredSkins',
    'description',
    'warrantyPolicy',
    'details',
    'heroCount',
    'skinCount',
    'rareSkinCount',
    'rareSkins',
  ]);

  const details = (account.details || {}) as Record<string, unknown>;

  // 1. Duyệt qua toàn bộ cặp Key - Value trong details (do admin cấu hình)
  Object.entries(details).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '' && !internalKeys.has(k)) {
      attrs.push({ key: k, value: String(v) });
      seenKeys.add(k.toLowerCase());
    }
  });

  // 2. Thêm các trường cơ bản nếu có giá trị thực tế và chưa được liệt kê
  if (account.rank && !seenKeys.has('rank') && !seenKeys.has('xếp hạng')) {
    attrs.push({ key: 'Xếp hạng', value: account.rank });
  }
  if (account.server && !seenKeys.has('server') && !seenKeys.has('máy chủ')) {
    attrs.push({ key: 'Máy chủ', value: account.server });
  }
  if (account.level !== undefined && !seenKeys.has('level') && !seenKeys.has('cấp độ')) {
    attrs.push({ key: 'Cấp độ', value: String(account.level) });
  }
  if (account.loginType && !seenKeys.has('logintype') && !seenKeys.has('đăng nhập')) {
    attrs.push({ key: 'Đăng nhập', value: account.loginType });
  }
  if (account.championsCount && !seenKeys.has('championscount') && !seenKeys.has('số tướng') && !seenKeys.has('tướng')) {
    attrs.push({ key: 'Số tướng', value: String(account.championsCount) });
  }
  if (account.skinsCount && !seenKeys.has('skinscount') && !seenKeys.has('số trang phục') && !seenKeys.has('trang phục')) {
    attrs.push({ key: 'Số trang phục', value: String(account.skinsCount) });
  }

  return attrs;
}

export default function AccountDetailView({ account, relatedAccounts }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const { isFavorite: checkFavorite, toggleFavorite } = useFavorites();
  const isFavorite = checkFavorite(account.code);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Bộ ảnh thực tế (chỉ chứa các ảnh có thật)
  const images = account.images && account.images.length > 0 ? account.images : [account.thumbnail];
  const attributes = extractAccountAttributes(account);

  // Tính % giảm giá thực tế nếu có
  const discountPercent =
    account.discountPercent ||
    (account.originalPrice > account.price
      ? Math.round(((account.originalPrice - account.price) / account.originalPrice) * 100)
      : null);

  // Theo dõi cuộn trang để hiển thị thanh Sticky Bar nổi phía dưới
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      message.success('Đã sao chép liên kết nick vào bộ nhớ tạm!');
    }
  };

  const sampleReviews = [
    {
      author: 'Nguyễn Tuấn A.',
      rating: 5,
      date: 'Hôm qua',
      comment: 'Nick chuẩn mô tả 100%, thanh toán QR quét xong 5 giây là có mật khẩu. Đã đổi sang mail chính chủ thành công!',
      verified: true,
    },
    {
      author: 'Trần Minh Đ.',
      rating: 5,
      date: '3 ngày trước',
      comment: 'Kho đồ đẹp đúng như trên hình chụp, giá rẻ hơn các bên khác. Support Zalo rep rất nhiệt tình.',
      verified: true,
    },
    {
      author: 'Lê Hoàng K.',
      rating: 5,
      date: '1 tuần trước',
      comment: 'Giao dịch nhanh, nick trắng thông tin đổi pass cái một. Lần sau sẽ tiếp tục ủng hộ shop!',
      verified: true,
    },
  ];

  const faqItems = [
    {
      key: '1',
      label: <span className="font-bold text-white text-xs sm:text-sm">Sau khi bấm &quot;Mua Ngay&quot; tôi sẽ nhận nick như thế nào?</span>,
      children: (
        <div className="text-xs sm:text-sm text-pink-200/80 leading-relaxed">
          Hệ thống bàn giao tự động 100%. Ngay khi bạn quét mã VietQR hoặc thanh toán bằng số dư ví, tài khoản & mật khẩu sẽ hiển thị ngay lập tức trên màn hình và được lưu an toàn trong mục &quot;Lịch Sử Đơn Hàng&quot; của bạn.
        </div>
      ),
    },
    {
      key: '2',
      label: <span className="font-bold text-white text-xs sm:text-sm">Tôi có được đổi mật khẩu và liên kết thông tin chính chủ không?</span>,
      children: (
        <div className="text-xs sm:text-sm text-pink-200/80 leading-relaxed">
          Có, 100% tài khoản trên sàn là thông tin trắng hoặc đã qua kiểm duyệt bảo mật. Bạn hoàn toàn có quyền đổi mật khẩu, liên kết email, số điện thoại chính chủ của bạn ngay sau khi nhận nick.
        </div>
      ),
    },
    {
      key: '3',
      label: <span className="font-bold text-white text-xs sm:text-sm">Chính sách bảo hành tài khoản như thế nào?</span>,
      children: (
        <div className="text-xs sm:text-sm text-pink-200/80 leading-relaxed">
          Shop cam kết bảo hành 1 đổi 1 hoặc hoàn tiền 100% trong 30 ngày nếu có bất kỳ lỗi nào xuất phát từ thông tin tài khoản không đúng như mô tả ban đầu.
        </div>
      ),
    },
    {
      key: '4',
      label: <span className="font-bold text-white text-xs sm:text-sm">Tôi có thể thanh toán qua những phương thức nào?</span>,
      children: (
        <div className="text-xs sm:text-sm text-pink-200/80 leading-relaxed">
          Hỗ trợ quét mã VietQR tất cả các ngân hàng tại Việt Nam (MB, Techcombank, Vietcombank, ACB, v.v.), Ví điện tử MoMo, ZaloPay và thẻ cào điện thoại tự động 24/7.
        </div>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'specs',
      label: (
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Thông Số & Mô Tả Chi Tiết</span>
        </span>
      ),
      children: (
        <div className="flex flex-col gap-6 py-4">
          {/* 1. BẢNG THÔNG SỐ CHI TIẾT THỰC TẾ (NẾU CÓ) */}
          {attributes.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Thông Số Kho Đồ & Thuộc Tính Thực Tế ({attributes.length} thuộc tính)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attributes.map((attr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#200d1e]/80 border border-white/5 flex flex-col justify-between hover:border-rose-500/20 transition"
                  >
                    <span className="text-[11px] text-pink-300/60 font-semibold uppercase">{attr.key}</span>
                    <span className="text-sm font-bold text-white mt-1 break-words">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. SKIN HIẾM / VẬT PHẨM ĐẶC BIỆT (NẾU CÓ) */}
          {((account.rareSkins && account.rareSkins.length > 0) ||
            (account.featuredSkins && account.featuredSkins.length > 0)) && (
            <div>
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Vật Phẩm / Trang Phục Nổi Bật</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {(account.rareSkins || account.featuredSkins || []).map((skin, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#260e23] border border-amber-500/20 text-xs text-amber-200 font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <span>✨</span>
                    <span>{skin}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MÔ TẢ NGƯỜI BÁN (NẾU CÓ) */}
          {account.description && account.description.trim() ? (
            <div>
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>Mô Tả & Ghi Chú Của Người Bán</span>
              </h4>
              <div className="p-4 rounded-2xl bg-[#1e0a1c] border border-white/5 text-xs sm:text-sm text-pink-200/80 leading-relaxed whitespace-pre-line">
                {account.description}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#1e0a1c]/40 border border-white/5 text-xs text-pink-300/40 italic flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400/60 flex-shrink-0" />
              <span>Tài khoản tự động được kiểm duyệt thông tin chuẩn xác. Vui lòng xem ảnh chụp thực tế bên trên.</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'instructions',
      label: (
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <Key className="w-4 h-4 text-amber-400" />
          <span>Quy Trình Bàn Giao & Đổi Thông Tin</span>
        </span>
      ),
      children: (
        <div className="flex flex-col gap-4 py-4 text-xs sm:text-sm text-pink-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#1e0a1c] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 font-black flex items-center justify-center text-sm border border-rose-500/20">
                1
              </div>
              <div className="font-bold text-white text-sm">Thanh toán tự động</div>
              <div className="text-pink-200/60 text-xs leading-relaxed">
                Bấm &quot;MUA NGAY&quot;, quét mã VietQR bất kỳ ngân hàng hoặc trừ trực tiếp số dư ví.
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#1e0a1c] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 font-black flex items-center justify-center text-sm border border-purple-500/20">
                2
              </div>
              <div className="font-bold text-white text-sm">Nhận thông tin đăng nhập</div>
              <div className="text-pink-200/60 text-xs leading-relaxed">
                Tài khoản và mật khẩu hiển thị ngay trên màn hình trong 3 - 5 giây và lưu trong đơn hàng.
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#1e0a1c] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/20">
                3
              </div>
              <div className="font-bold text-white text-sm">Đổi thông tin chính chủ</div>
              <div className="text-pink-200/60 text-xs leading-relaxed">
                Đăng nhập vào game / cổng phát hành, đổi mật khẩu và liên kết số điện thoại/email của bạn.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-amber-200/90 flex items-start gap-3 mt-2">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">Lưu ý an toàn:</span> Sau khi nhận tài khoản, quý khách vui lòng đổi mật khẩu ngay và bật bảo mật 2 lớp (2FA) để đảm bảo an toàn tuyệt đối.
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'warranty',
      label: (
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cam Kết & Bảo Hành 100%</span>
        </span>
      ),
      children: (
        <div className="flex flex-col gap-4 py-4 text-xs sm:text-sm text-pink-100 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#190918] border border-emerald-500/20 flex flex-col gap-2">
              <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Nguồn Gốc Tài Khoản Rõ Ràng 100%</span>
              </div>
              <p className="text-pink-200/70 text-xs">
                Tất cả tài khoản trên sàn đều được qua quy trình kiểm duyệt an toàn, thông tin bảo mật, không tranh chấp, lịch sử nạp sạch.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#190918] border border-purple-500/20 flex flex-col gap-2">
              <div className="font-bold text-purple-400 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <span>Chính Sách Đổi Trả & Hoàn Tiền 100%</span>
              </div>
              <p className="text-pink-200/70 text-xs">
                Hỗ trợ kỹ thuật và hoàn tiền 100% nếu phát hiện lỗi phát sinh từ tài khoản không đúng như mô tả ban đầu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1a0a19] border border-white/5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-white text-sm">Bảo Hiểm Giao Dịch Toàn Diện</div>
                <div className="text-pink-300/60 text-xs">Giao dịch được bảo hộ bởi GameStore Việt Nam</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-xs">
                ✓ Đã Ký Quỹ Bảo Hiểm
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'reviews',
      label: (
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <Star className="w-4 h-4 text-amber-400" />
          <span>Đánh Giá Khách Hàng ({sampleReviews.length})</span>
        </span>
      ),
      children: (
        <div className="flex flex-col gap-4 py-4">
          {/* Review Summary Score */}
          <div className="p-4 rounded-2xl bg-[#1f0b1d] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black text-amber-400">4.9</div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[11px] text-pink-200/60 mt-0.5">Dựa trên 1,240+ đánh giá xác thực trên sàn</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>99.8% Khách Hàng Hài Lòng</span>
            </div>
          </div>

          {/* Reviews List */}
          <div className="flex flex-col gap-3">
            {sampleReviews.map((rev, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#190918] border border-white/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{rev.author}</span>
                    {rev.verified && (
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        ✓ Đã Mua Nick
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-pink-300/40">{rev.date}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-pink-200/80 leading-relaxed mt-0.5">{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 text-xs text-pink-300/60">
        <div className="flex items-center gap-2 truncate">
          <Link href="/" className="hover:text-white transition flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trang Chủ</span>
          </Link>
          <span>/</span>
          <Link href={`/#kho-nick`} className="hover:text-white transition font-medium">
            {account.gameName || 'Nick Game'}
          </Link>
          <span>/</span>
          <span className="text-white font-bold truncate">{account.code}</span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#200d1e] hover:bg-[#2c1229] border border-white/10 text-pink-200 transition cursor-pointer text-xs font-semibold"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Chia sẻ nick</span>
        </button>
      </div>

      {/* TOP SECTION: Gallery Left + Specs & Pricing Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT (7 cols): Gallery & Trust Highlights */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative w-full aspect-[16/10] rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl">
            <Image
              src={images[activeImageIndex] || account.thumbnail}
              alt={account.title}
              fill
              priority
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

            <div className="absolute top-4 left-4 flex items-center gap-2 z-10 flex-wrap">
              {account.gameName && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-lg">
                  {account.gameName}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/70 text-pink-100 border border-white/10">
                {account.code}
              </span>
              {account.status === 'sold' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-700/90 text-zinc-300 border border-white/10">
                  Đã Bán
                </span>
              )}
            </div>

            {/* Zoom In Button using Ant Design Preview */}
            <button
              type="button"
              onClick={() => setPreviewVisible(true)}
              className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-black/60 hover:bg-rose-600/90 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition shadow-xl cursor-pointer z-10"
              title="Phóng to ảnh kho đồ"
            >
              <ZoomIn className="w-4 h-4 text-pink-200" />
              <span>Phóng to ({activeImageIndex + 1}/{images.length})</span>
            </button>

            {/* Ant Design Preview Group for full-screen zoom, rotate, pan */}
            <div className="hidden">
              <AntdImage.PreviewGroup
                preview={{
                  open: previewVisible,
                  onOpenChange: (vis) => setPreviewVisible(vis),
                  current: activeImageIndex,
                }}
                items={images}
              >
                {images.map((img, idx) => (
                  <AntdImage key={idx} src={img} />
                ))}
              </AntdImage.PreviewGroup>
            </div>
          </div>

          {/* Thumbnail Strip (Chỉ hiển thị khi có từ 2 ảnh trở lên) */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-rose-500 scale-105 shadow-md shadow-rose-500/30'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt="" fill unoptimized className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}

          {/* Quick Security Highlights Under Gallery */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-[#190918] border border-white/5 flex flex-col items-center text-center gap-1">
              <Clock className="w-4 h-4 text-rose-400" />
              <span className="text-[11px] font-bold text-white">Bàn giao 5s</span>
              <span className="text-[9px] text-pink-300/50">Tự động 24/7</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#190918] border border-white/5 flex flex-col items-center text-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-white">Bảo hiểm 100%</span>
              <span className="text-[9px] text-pink-300/50">Đổi trả 30 ngày</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#190918] border border-white/5 flex flex-col items-center text-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-bold text-white">Thông tin sạch</span>
              <span className="text-[9px] text-pink-300/50">Đổi chính chủ</span>
            </div>
          </div>
        </div>

        {/* RIGHT (5 cols): Buy Box & Specs Summary */}
        <div className="lg:col-span-5 flex flex-col gap-5 p-6 rounded-3xl bg-[#190918]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 text-xs text-pink-300/60 font-medium flex-wrap">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Check className="w-3.5 h-3.5" />
                Bàn giao tự động
              </span>
              {account.isVerified && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đã kiểm duyệt
                  </span>
                </>
              )}
              {account.isHot && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Flame className="w-3.5 h-3.5" />
                    Nick Hot
                  </span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2 leading-snug">
              {account.title}
            </h1>

            {/* Tags (Chỉ hiển thị nếu có tags thực tế) */}
            {account.tags && account.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {account.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/5 border border-white/10 text-pink-200"
                  >
                    <Tag className="w-2.5 h-2.5 text-rose-400" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Price Box */}
          <div className="p-4 rounded-2xl bg-[#230d20] border border-rose-500/20 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-pink-300/60 font-semibold uppercase">Giá Mua Ngay</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-400">
                  {formatPrice(account.price)}
                </span>
                {account.originalPrice > account.price && (
                  <span className="text-xs text-zinc-500 line-through">
                    {formatPrice(account.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            {discountPercent && discountPercent > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-md">
                Tiết kiệm {discountPercent}%
              </span>
            )}
          </div>

          {/* Dynamic Quick Attributes Summary (Chỉ hiển thị các thuộc tính có thật) */}
          {attributes.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {attributes.slice(0, 6).map((attr, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#200d1e] border border-white/5 flex flex-col justify-center">
                  <span className="text-pink-300/50 text-[10px] uppercase font-bold truncate">
                    {attr.key}
                  </span>
                  <span className="text-white font-bold text-xs sm:text-sm mt-0.5 truncate" title={attr.value}>
                    {attr.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Purchase Perks & Gifts */}
          <div className="p-3.5 rounded-2xl bg-[#1b081a] border border-white/5 flex flex-col gap-2 text-xs text-pink-200/80">
            <div className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Gift className="w-3.5 h-3.5 text-rose-400" />
              <span>Đặc Quyền & Quà Tặng Kèm Theo</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-[11px] text-pink-200/70">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Bảo hiểm tài khoản 1 đổi 1 trong 30 ngày.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Hỗ trợ gỡ liên kết & đổi thông tin chính chủ 1-1 miễn phí.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Tặng Voucher giảm 10% cho đơn hàng tiếp theo.</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsBuyModalOpen(true)}
              disabled={account.status === 'sold'}
              className="w-full py-4 rounded-full btn-gradient-hero text-sm font-black text-white shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-5 h-5" />
              <span>{account.status === 'sold' ? 'TÀI KHOẢN ĐÃ BÁN' : 'MUA NGAY (VIETQR BÀN GIAO 5S)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleFavorite(account)}
                className="py-2.5 rounded-full bg-[#280e25] hover:bg-[#341431] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isFavorite ? 'Đã Lưu Yêu Thích' : 'Lưu Yêu Thích'}</span>
              </button>

              <a
                href="https://zalo.me"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 rounded-full bg-[#200d1e] hover:bg-[#2c1229] border border-white/10 text-xs font-bold text-pink-200 flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Tư Vấn Zalo</span>
              </a>
            </div>
          </div>

          {/* Security alert */}
          <div className="p-3 rounded-xl bg-[#1c0a1b] border border-white/5 text-[11px] text-pink-200/60 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Hệ thống bảo mật tuyệt đối. Thông tin đăng nhập bàn giao tự động 24/7.</span>
          </div>
        </div>
      </div>

      {/* DETAILED TABS SECTION */}
      <div className="p-6 rounded-3xl bg-[#180917]/80 border border-white/10 shadow-xl">
        <Tabs defaultActiveKey="specs" items={tabItems} className="custom-admin-tabs" />
      </div>

      {/* FAQ ACCORDION SECTION */}
      <div className="p-6 rounded-3xl bg-[#180917]/80 border border-white/10 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-rose-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">Câu Hỏi Thường Gặp Khi Mua Nick</h3>
        </div>
        <Collapse
          items={faqItems}
          defaultActiveKey={['1']}
          bordered={false}
          className="custom-faq-collapse bg-transparent"
        />
      </div>

      {/* RELATED ACCOUNTS (Chỉ hiển thị nếu có tài khoản liên quan) */}
      {relatedAccounts.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Nick {account.gameName || 'Game'} Cùng Loại Có Thể Bạn Thích
              </h3>
              <p className="text-xs text-pink-300/60 mt-0.5">
                Khám phá thêm {relatedAccounts.length} nick tương tự đang sẵn sàng giao dịch
              </p>
            </div>
            <Link
              href="/#kho-nick"
              className="text-xs font-bold text-rose-400 hover:text-white transition flex items-center gap-1"
            >
              <span>Xem tất cả kho nick</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
            {relatedAccounts.map((rel) => (
              <AccountCard
                key={rel.id || rel.code}
                account={rel}
                isFavorite={false}
                onToggleFavorite={() => {}}
                onSelectAccount={(code) => {
                  const clean = encodeURIComponent(code.replace('#', ''));
                  router.push(`/account/${clean}`);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* SUPPORT & HOTLINE CTA BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#2c0f28] to-[#1a0818] border border-rose-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white">Cần Hỗ Trợ Đổi Thông Tin Hoặc Tư Vấn Nick?</h4>
            <p className="text-xs text-pink-200/60 mt-0.5">Đội ngũ kỹ thuật viên trực tuyến 24/7 sẵn sàng giải đáp mọi thắc mắc của bạn.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <a
            href="https://zalo.me"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat Zalo Ngay</span>
          </a>
        </div>
      </div>

      {/* STICKY BOTTOM FLOATING BUY BAR (KHI CUỘN TRANG) */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#140513]/95 backdrop-blur-xl border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex-shrink-0 hidden sm:block">
                <Image src={account.thumbnail} alt="" fill unoptimized className="object-cover" sizes="48px" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[360px]">
                  {account.title}
                </div>
                <div className="text-[10px] text-pink-300/60 font-mono">
                  Mã: {account.code} • {account.gameName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-base sm:text-lg font-black text-rose-400">
                  {formatPrice(account.price)}
                </span>
                {account.originalPrice > account.price && (
                  <span className="text-[10px] text-zinc-500 line-through">
                    {formatPrice(account.originalPrice)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsBuyModalOpen(true)}
                disabled={account.status === 'sold'}
                className="px-5 py-2.5 rounded-full btn-gradient-hero text-xs font-bold text-white shadow-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{account.status === 'sold' ? 'ĐÃ BÁN' : 'MUA NGAY'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <QuickBuyModal
        account={account}
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
      />
    </div>
  );
}

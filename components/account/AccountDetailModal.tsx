'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GameAccount } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import { Modal, Image as AntdImage } from 'antd';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  X,
  ShieldCheck,
  Heart,
  ExternalLink,
  Zap,
  ZoomIn,
  Tag,
  Check,
  Flame,
} from 'lucide-react';

interface AccountDetailModalProps {
  account: GameAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (acc: GameAccount) => void;
  onToggleFavorite?: (code: string) => void;
  isFavorite?: boolean;
}

/**
 * Trích xuất danh sách thuộc tính thực tế của tài khoản (loại bỏ key nội bộ và thuộc tính rỗng)
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

export default function AccountDetailModal({
  account,
  isOpen,
  onClose,
  onBuyNow,
  onToggleFavorite: propsToggleFavorite,
  isFavorite: propsIsFavorite,
}: AccountDetailModalProps) {
  const { isFavorite: checkFavorite, toggleFavorite } = useFavorites();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  if (!account) return null;

  const isFavorite = propsIsFavorite !== undefined ? propsIsFavorite : checkFavorite(account.code);
  const handleToggleFavorite = () => {
    if (propsToggleFavorite) {
      propsToggleFavorite(account.code);
    } else {
      toggleFavorite(account);
    }
  };

  const images = account.images && account.images.length > 0 ? account.images : [account.thumbnail];
  const safeCode = account.code.replace('#', '');
  const attributes = extractAccountAttributes(account);

  const discountPercent =
    account.discountPercent ||
    (account.originalPrice > account.price
      ? Math.round(((account.originalPrice - account.price) / account.originalPrice) * 100)
      : null);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      closeIcon={<X className="w-5 h-5 text-pink-300 hover:text-white" />}
      styles={{
        body: {
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#160815',
          borderRadius: '24px',
        },
      }}
    >
      <div className="flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar">
        {/* TOP: Image Gallery */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-black/60 group">
          <Image
            src={images[activeImageIndex] || account.thumbnail}
            alt={account.title}
            fill
            unoptimized
            className="object-cover"
            sizes="760px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#160815] via-transparent to-black/40" />

          {/* Badges on Gallery */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10 flex-wrap">
            {account.gameName && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600/90 text-white backdrop-blur-md shadow-md">
                {account.gameName}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/60 text-pink-200 backdrop-blur-md border border-white/10">
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
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-rose-600/90 text-xs font-bold flex items-center gap-1.5 transition shadow-lg z-10 cursor-pointer"
            title="Phóng to ảnh kho đồ"
          >
            <ZoomIn className="w-3.5 h-3.5 text-pink-200" />
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

          {/* Quick Favorite Icon */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="absolute top-4 right-12 p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:text-rose-500 transition z-10 cursor-pointer"
            aria-label="Lưu yêu thích"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Thumbnail Strip (Chỉ hiển thị khi có từ 2 ảnh trở lên) */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 p-3 bg-[#120511] border-b border-white/5 overflow-x-auto custom-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition cursor-pointer ${
                  activeImageIndex === idx ? 'border-rose-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={img} alt="" fill unoptimized className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}

        {/* BODY DETAILS */}
        <div className="p-6 flex flex-col gap-5">
          {/* Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2 text-xs text-pink-300/60 font-medium mb-1">
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

              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                {account.title}
              </h2>

              {/* Tags (Chỉ hiển thị khi có tags thực tế) */}
              {account.tags && account.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {account.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-pink-200"
                    >
                      <Tag className="w-2.5 h-2.5 text-rose-400" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price block */}
            <div className="flex flex-col sm:items-end flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-rose-400">
                  {formatPrice(account.price)}
                </span>
                {discountPercent && discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    -{discountPercent}%
                  </span>
                )}
              </div>
              {account.originalPrice > account.price && (
                <span className="text-xs text-zinc-500 line-through">
                  {formatPrice(account.originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Quick Specs Grid (Chỉ hiển thị các thuộc tính thực tế) */}
          {attributes.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {attributes.map((attr, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#220d20] border border-white/5 flex flex-col">
                  <span className="text-[10px] text-pink-300/50 uppercase font-bold truncate">
                    {attr.key}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                    {attr.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Featured Skins / Items (Chỉ hiển thị nếu có) */}
          {((account.rareSkins && account.rareSkins.length > 0) ||
            (account.featuredSkins && account.featuredSkins.length > 0)) && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
                Vật Phẩm / Trang Phục Nổi Bật
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(account.rareSkins || account.featuredSkins || []).map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#2d1029] text-amber-200 border border-amber-500/20"
                  >
                    ✨ {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description (Chỉ hiển thị nếu có mô tả thực tế) */}
          {account.description && account.description.trim() && (
            <div className="p-3.5 rounded-xl bg-[#1d0a1b] border border-white/5 text-xs text-pink-200/80 leading-relaxed whitespace-pre-line">
              {account.description}
            </div>
          )}

          {/* Trust Guarantee */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Tài khoản tự động bàn giao thông tin ngay khi hoàn tất thanh toán.</span>
          </div>

          {/* ACTIONS ROW */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href={`/account/${safeCode}`}
              onClick={onClose}
              className="text-xs font-semibold text-pink-300 hover:text-white flex items-center gap-1.5 transition py-2 px-3 rounded-xl hover:bg-white/5"
            >
              <span>Xem trang đầy đủ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="px-4 py-2.5 rounded-full bg-[#2a0e25] border border-white/10 text-xs font-bold text-white hover:bg-[#381432] transition cursor-pointer"
              >
                {isFavorite ? 'Đã Lưu' : 'Lưu Yêu Thích'}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBuyNow(account);
                }}
                disabled={account.status === 'sold'}
                className="px-6 py-2.5 rounded-full btn-gradient-hero text-xs font-bold text-white shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>{account.status === 'sold' ? 'ĐÃ BÁN' : `MUA NGAY (${formatPrice(account.price)})`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

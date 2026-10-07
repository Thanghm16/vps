'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeroAccountSlide } from '@/types/account';
import { BannerClientData } from '@/types/db-banner';
import { formatPrice } from '@/lib/utils';
import { ChevronRight, Sparkles, Gamepad2, ShieldCheck, Flame, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

interface HeroBannerProps {
  slides?: HeroAccountSlide[];
  customBanners?: BannerClientData[];
  isLoading?: boolean;
  onSelectAccount?: (code: string) => void;
}

export default function HeroBanner({
  slides = [],
  customBanners = [],
  isLoading = false,
  onSelectAccount,
}: HeroBannerProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="relative w-full h-full min-h-[480px] sm:min-h-[520px] rounded-[28px] overflow-hidden bg-[#180a17] border border-white/10 shadow-2xl flex flex-col justify-between p-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-white/10 rounded-full" />
          <div className="h-6 w-12 bg-white/5 rounded" />
        </div>
        <div className="space-y-4 max-w-lg">
          <div className="h-4 w-40 bg-rose-500/20 rounded" />
          <div className="h-10 bg-white/10 rounded-xl w-full" />
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-12 w-44 bg-rose-600/30 rounded-full mt-4" />
        </div>
      </div>
    );
  }

  // Tracking click vào banner
  const handleBannerClick = (banner: BannerClientData) => {
    if (banner.id) {
      // Gọi non-blocking tracking click
      fetch(`/api/banners/${banner.id}/click`, { method: 'POST' }).catch(() => {});
    }

    if (!banner.link) return;

    if (banner.openInNewTab || banner.link.startsWith('http')) {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    } else {
      router.push(banner.link);
    }
  };

  // 2. CASE A: HIỂN THỊ BANNER QUẢNG CÁO TÙY CHỈNH TỪ ADMIN (Ưu tiên cao nhất)
  if (customBanners && customBanners.length > 0) {
    const currentBanner = customBanners[activeIndex] || customBanners[0];

    return (
      <div className="relative w-full h-full min-h-[480px] sm:min-h-[520px] rounded-[28px] overflow-hidden bg-[#180a17] border border-white/10 shadow-2xl flex flex-col group">
        {/* SWIPER BACKGROUND SLIDER */}
        <div className="absolute inset-0 z-0">
          <Swiper
            modules={[Autoplay, EffectFade, Pagination]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            speed={800}
            autoplay={{
              delay: 6500,
              disableOnInteraction: false,
            }}
            loop={customBanners.length > 1}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
            className="w-full h-full"
          >
            {customBanners.map((banner, idx) => {
              const desktopUrl = banner.desktopImage?.url || '/1768727344439.jpg';
              const mobileUrl = banner.mobileImage?.url || desktopUrl;

              return (
                <SwiperSlide
                  key={banner.id || idx}
                  className="relative w-full h-full cursor-pointer"
                  onClick={() => handleBannerClick(banner)}
                >
                  <div className="relative w-full h-full">
                    {/* Responsive Picture: Mobile vs Desktop - 100% Brightness, Không phủ màu tối */}
                    <picture>
                      <source media="(max-width: 640px)" srcSet={mobileUrl} />
                      <Image
                        src={desktopUrl}
                        alt={banner.title}
                        fill
                        priority={idx === 0}
                        unoptimized
                        className="object-cover object-center transition-transform duration-700 ease-out"
                        sizes="(max-width: 1024px) 100vw, 65vw"
                      />
                    </picture>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* FOREGROUND INTERACTIVE CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col justify-between p-5 sm:p-7 lg:p-9 pointer-events-none">
          {/* TOP ROW: Tag & Slide Counter */}
          <div className="flex items-center justify-between gap-4 pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`tag-${currentBanner.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2"
              >
                <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-rose-300 shadow-md flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sự Kiện Hot 2026</span>
                </span>
              </motion.div>
            </AnimatePresence>

            {customBanners.length > 1 && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={`counter-${currentBanner.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs sm:text-sm font-mono font-bold text-pink-200 shadow-md tracking-wider"
                >
                  0{activeIndex + 1} / 0{customBanners.length}
                </motion.span>
              </AnimatePresence>
            )}
          </div>

          {/* BOTTOM CONTENT: Animated Title, Subtitle & CTA Button */}
          <div className="mt-auto pt-6 flex flex-col gap-3 pointer-events-auto">
            {(currentBanner.title || currentBanner.subtitle) && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`banner-text-${currentBanner.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="max-w-xl flex flex-col p-4 sm:p-5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Hệ Thống Giao Dịch Tự Động 24/7
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug drop-shadow-md">
                    {currentBanner.title}
                  </h1>

                  {currentBanner.subtitle && (
                    <p className="text-xs sm:text-sm text-pink-100/90 mt-1.5 line-clamp-2 leading-relaxed drop-shadow">
                      {currentBanner.subtitle}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* CTA BUTTON */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBannerClick(currentBanner);
                }}
                className="px-6 py-3 rounded-full btn-gradient-hero text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl shadow-rose-600/40 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
              >
                <span>{currentBanner.buttonText || currentBanner.ctaText || 'Khám Phá Ngay'}</span>
                {currentBanner.openInNewTab ? (
                  <ArrowUpRight className="w-4 h-4 ml-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                )}
              </button>
            </div>

            {/* CUSTOM CAROUSEL DOTS */}
            {customBanners.length > 1 && (
              <div className="flex items-center gap-2 pt-2">
                {customBanners.map((b, idx) => (
                  <button
                    key={b.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      swiperInstance?.slideToLoop(idx);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeIndex === idx
                        ? 'w-6 bg-rose-500 shadow-sm shadow-rose-500/80'
                        : 'w-2 bg-white/40 hover:bg-white/70 shadow'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. CASE B: FALLBACK SLIDES (HIỂN THỊ TÀI KHOẢN FEATURED HOẶC DEFAULT WELCOME)
  if (!slides || slides.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[480px] sm:min-h-[520px] rounded-[28px] overflow-hidden bg-gradient-to-tr from-[#1b071a] via-[#280c25] to-[#120410] border border-white/10 shadow-2xl flex flex-col justify-between p-6 sm:p-10 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Sàn Giao Dịch Nick VIP 2026</span>
          </span>
        </div>

        <div className="my-auto max-w-xl flex flex-col gap-3 py-6">
          <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Hệ Thống Bàn Giao Tự Động 24/7</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Kho Nick Game <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400">Chính Chủ</span> Uy Tín Số 1
          </h1>

          <p className="text-xs sm:text-sm text-pink-200/70 leading-relaxed mt-1">
            Hàng nghìn tài khoản game Liên Quân, Valorant, Free Fire, FC Online giá tốt nhất. Bảo hiểm 100%, bảo hành đổi trả minh bạch.
          </p>

          <div className="flex items-center gap-3 pt-4">
            <a
              href="#kho-nick"
              className="px-6 py-3 rounded-full btn-gradient-hero text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition"
            >
              <span>Khám Phá Kho Nick</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-pink-300/60 pt-4 border-t border-white/5 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Thông tin sạch</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5 font-semibold text-rose-300">
            <Gamepad2 className="w-4 h-4" />
            <span>Đa dạng tựa game hot</span>
          </div>
        </div>
      </div>
    );
  }

  const currentSlide = slides[activeIndex] || slides[0];

  return (
    <div className="relative w-full h-full min-h-[480px] sm:min-h-[520px] rounded-[28px] overflow-hidden bg-[#180a17] border border-white/10 shadow-2xl flex flex-col group">
      {/* SWIPER BACKGROUND SLIDER */}
      <div className="absolute inset-0 z-0">
        <Swiper
          modules={[Autoplay, EffectFade, Pagination]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={800}
          autoplay={{
            delay: 6000,
            disableOnInteraction: false,
          }}
          loop={slides.length > 1}
          onSwiper={setSwiperInstance}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="w-full h-full"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={slide.id} className="relative w-full h-full">
              <div className="relative w-full h-full">
                <Image
                  src={slide.bannerImage}
                  alt={slide.title}
                  fill
                  priority={idx === 0}
                  unoptimized
                  className="object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-1000 ease-out"
                  sizes="(max-width: 1024px) 100vw, 65vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f040d] via-[#1a0715]/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#12040f] via-[#1c0817]/70 to-transparent" />
                <div className="absolute inset-0 bg-[#350d24]/20 mix-blend-color" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* FOREGROUND INTERACTIVE CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-10 pointer-events-none">
        {/* TOP ROW: Tags & Slide Number */}
        <div className="flex items-center justify-between gap-4 pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`tags-${currentSlide.id}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35 }}
              className="flex flex-wrap items-center gap-2"
            >
              {currentSlide.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-[#2a0e23]/80 backdrop-blur-md border border-white/10 text-pink-100/90 shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.span
              key={`num-${currentSlide.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm sm:text-base font-bold text-pink-200/50 tracking-wider"
            >
              {currentSlide.slideNumber}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* BOTTOM CONTENT: Animated Text, Subtitle, Pricing & CTA */}
        <div className="mt-auto pt-8 flex flex-col gap-4 pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="max-w-xl flex flex-col"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentSlide.gameName} • {currentSlide.accountCode}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
                {currentSlide.title}
              </h2>

              <p className="text-sm sm:text-base font-semibold text-pink-200 mt-1">
                {currentSlide.subtitle}
              </p>

              <p className="text-xs sm:text-sm text-pink-100/70 mt-2 line-clamp-2 leading-relaxed">
                {currentSlide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* PRICE & CTA ROW */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-2">
            <span className="text-sm sm:text-base text-zinc-400 line-through font-medium">
              {formatPrice(currentSlide.originalPrice)}
            </span>

            <Link
              href={`/account/${encodeURIComponent(currentSlide.accountCode.replace('#', ''))}`}
              onClick={() => onSelectAccount?.(currentSlide.accountCode)}
              className="px-5 sm:px-6 py-2.5 rounded-full btn-gradient-hero text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
            >
              <span>{formatPrice(currentSlide.price)}</span>
              <span className="text-[11px] font-normal text-pink-200">
                ({currentSlide.discountBadge})
              </span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          </div>

          {/* CUSTOM CAROUSEL DOTS */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2 pt-3">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => swiperInstance?.slideToLoop(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeIndex === idx
                      ? 'w-6 bg-rose-500 shadow-sm shadow-rose-500/50'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Award,
  Sparkles,
  Gift,
  Coins,
  Gamepad2,
  TicketPercent,
  CheckCircle2,
  ArrowRight,
  RotateCw,
  Frown,
  ExternalLink,
  Wallet,
  X,
} from 'lucide-react';
import { Modal } from 'antd';
import { RewardType, ClaimStatus } from '@/types/lucky-wheel';

interface RewardResultModalProps {
  open: boolean;
  onClose: () => void;
  onSpinAgain?: () => void;
  reward?: {
    id: string;
    name: string;
    type: RewardType;
    description?: string;
    image?: string;
    value: number;
  } | null;
  claimStatus?: ClaimStatus;
  claimDetails?: Record<string, any>;
  canSpinAgain?: boolean;
}

export default function RewardResultModal({
  open,
  onClose,
  onSpinAgain,
  reward,
  claimStatus = 'NOT_APPLICABLE',
  claimDetails = {},
  canSpinAgain = true,
}: RewardResultModalProps) {
  const canvasConfettiRef = useRef<HTMLCanvasElement>(null);

  // Hiệu ứng pháo hoa hạt lấp lánh (Canvas Particle Confetti) khi trúng giải
  useEffect(() => {
    if (!open || !reward || reward.type === 'NOTHING') return;

    const canvas = canvasConfettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
      rotation: number;
      vr: number;
    }> = [];

    const colors = ['#f43f5e', '#ec4899', '#fbbf24', '#3b82f6', '#10b981', '#a855f7'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
      });
    }

    let animationId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Trọng lực
        p.vx *= 0.98;
        p.rotation += p.vr;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationId = requestAnimationFrame(render);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [open, reward]);

  if (!reward) return null;

  const isWinning = reward.type !== 'NOTHING';

  const getRewardIcon = () => {
    switch (reward.type) {
      case 'ACCOUNT':
        return <Gamepad2 className="w-10 h-10 text-rose-400" />;
      case 'COUPON':
        return <TicketPercent className="w-10 h-10 text-purple-400" />;
      case 'MONEY':
        return <Coins className="w-10 h-10 text-amber-400" />;
      case 'EXTRA_SPIN':
        return <RotateCw className="w-10 h-10 text-emerald-400" />;
      case 'PRODUCT':
        return <Gift className="w-10 h-10 text-pink-400" />;
      case 'NOTHING':
      default:
        return <Frown className="w-10 h-10 text-zinc-400" />;
    }
  };

  return (
    <>
      {/* Canvas Confetti Fullscreen Overlay */}
      {open && isWinning && (
        <canvas
          ref={canvasConfettiRef}
          className="fixed inset-0 pointer-events-none z-[1050]"
        />
      )}

      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={480}
        closeIcon={<X className="w-5 h-5 text-pink-300/80 hover:text-white" />}
        styles={{
          body: {
            background: 'linear-gradient(135deg, #180616 0%, #10020f 100%)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(244, 63, 94, 0.25)',
          },
        }}
      >
        <div className="flex flex-col items-center text-center">
          {/* ICON BADGE */}
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 relative ${
              isWinning
                ? 'bg-gradient-to-tr from-rose-600/30 via-pink-600/20 to-purple-600/30 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/60'
                : 'bg-white/5 ring-1 ring-white/10'
            }`}
          >
            {getRewardIcon()}
            {isWinning && (
              <span className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* HEADER TITLE */}
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">
            {isWinning ? 'CHÚC MỪNG BẠN TRÚNG THƯỞNG!' : 'CHÚC BẠN MAY MẮN LẦN SAU!'}
          </h2>

          <p className="text-xs text-pink-200/70 mb-4 max-w-sm">
            {isWinning
              ? 'Phần thưởng đã được ghi nhận và tự động chuyển vào tài khoản của bạn.'
              : 'Đừng nản lòng, thần may mắn sẽ mỉm cười với bạn ở lượt quay kế tiếp!'}
          </p>

          {/* REWARD CARD */}
          <div
            className={`w-full p-4 rounded-2xl mb-5 flex flex-col items-center gap-2 border ${
              isWinning
                ? 'bg-gradient-to-b from-rose-950/40 via-purple-950/20 to-black/40 border-rose-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider font-bold text-rose-400">
              {reward.type === 'ACCOUNT'
                ? 'Tài khoản Game'
                : reward.type === 'COUPON'
                ? 'Mã giảm giá Voucher'
                : reward.type === 'MONEY'
                ? 'Cộng tiền tài khoản'
                : reward.type === 'EXTRA_SPIN'
                ? 'Lượt quay may mắn'
                : reward.type === 'PRODUCT'
                ? 'Phần quà vật phẩm'
                : 'Kết quả lượt quay'}
            </span>

            <span className="text-xl font-black text-white px-2">
              {reward.name}
            </span>

            {/* Chi tiết cụ thể theo từng loại phần thưởng */}
            {reward.type === 'MONEY' && reward.value > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mt-1">
                <Coins className="w-3.5 h-3.5" />
                <span>+ {reward.value.toLocaleString('vi-VN')} ₫ vào số dư ví</span>
              </div>
            )}

            {reward.type === 'EXTRA_SPIN' && reward.value > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold mt-1">
                <RotateCw className="w-3.5 h-3.5" />
                <span>+ {reward.value} lượt quay thưởng miễn phí</span>
              </div>
            )}

            {reward.type === 'COUPON' && claimDetails?.couponCode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold mt-1">
                <span>MÃ VOUCHER:</span>
                <span className="text-white underline">{claimDetails.couponCode}</span>
              </div>
            )}

            {reward.type === 'ACCOUNT' && claimDetails?.orderCode && (
              <div className="flex flex-col items-center gap-1 mt-1">
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã bàn giao tài khoản vào Đơn Hàng
                </span>
                <span className="text-[11px] text-pink-200/60 font-mono">
                  Mã đơn: #{claimDetails.orderCode}
                </span>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            {reward.type === 'ACCOUNT' ? (
              <Link
                href="/profile?tab=orders"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Xem thông tin nick trúng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : reward.type === 'MONEY' ? (
              <Link
                href="/profile"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Kiểm tra số dư ví</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : null}

            {canSpinAgain && onSpinAgain && (
              <button
                onClick={() => {
                  onClose();
                  onSpinAgain();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Quay tiếp ngay</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-pink-100 font-semibold text-xs transition cursor-pointer border border-white/10"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

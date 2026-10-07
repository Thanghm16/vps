'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Zap, Flame, Award, Gift, Coins, RefreshCw } from 'lucide-react';

export interface WheelRewardSlice {
  id: string;
  name: string;
  type: string;
  image?: string;
  color?: string;
  textColor?: string;
  value: number;
  sortOrder: number;
}

interface WheelCanvasProps {
  rewards: WheelRewardSlice[];
  isSpinning: boolean;
  targetIndex: number | null;
  onSpinEnd: () => void;
  spinDuration?: number; // milliseconds (e.g. 5000)
}

// Bảng màu gradient fallback nếu admin không cài đặt màu cụ thể
const SLICE_COLORS = [
  '#dc2626', // Red
  '#4f46e5', // Indigo
  '#d97706', // Amber
  '#059669', // Emerald
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#e11d48', // Rose
  '#2563eb', // Blue
  '#ea580c', // Orange
  '#16a34a', // Green
];

export default function WheelCanvas({
  rewards,
  isSpinning,
  targetIndex,
  onSpinEnd,
  spinDuration = 5500,
}: WheelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentRotationRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickSectorRef = useRef<number>(-1);
  const isSpinningRef = useRef(false);

  // Âm thanh cơ học (Synthesized Web Audio Ticking) khi kim quét qua từng chốt
  const playTickSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') {
        ctx?.resume();
      }
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Bỏ qua nếu browser chặn audio tự động
    }
  }, []);

  // Vẽ Canvas Vòng Quay
  const drawWheel = useCallback(
    (rotationAngle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 24; // Khoảng trống cho viền đèn LED

      ctx.clearRect(0, 0, size, size);

      if (!rewards || rewards.length === 0) {
        ctx.fillStyle = '#1e1022';
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.fill();
        return;
      }

      const numSlices = rewards.length;
      const sliceAngle = (2 * Math.PI) / numSlices;

      // 1. Vẽ các lát cắt (Sectors)
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotationAngle);

      rewards.forEach((reward, i) => {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Màu lát cắt
        const sliceColor =
          reward.color && reward.color.trim() !== ''
            ? reward.color
            : SLICE_COLORS[i % SLICE_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();

        // Gradient màu cho từng sector để tạo chiều sâu gaming 3D
        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
        grad.addColorStop(0, '#1c081e');
        grad.addColorStop(0.3, sliceColor);
        grad.addColorStop(1, sliceColor);

        ctx.fillStyle = grad;
        ctx.fill();

        // Viền giữa các sector
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Vẽ text tên phần thưởng trên sector
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = reward.textColor || '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';

        const maxTextWidth = radius * 0.55;
        let displayName = reward.name;
        if (ctx.measureText(displayName).width > maxTextWidth) {
          // Cắt bớt nếu tên quá dài
          while (ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }

        ctx.fillText(displayName, radius - 28, 0);

        // Biểu tượng icon nhỏ theo loại giải
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const typeLabel =
          reward.type === 'ACCOUNT'
            ? 'NICK GAME'
            : reward.type === 'COUPON'
            ? 'VOUCHER'
            : reward.type === 'MONEY'
            ? 'TIỀN MẶT'
            : reward.type === 'EXTRA_SPIN'
            ? '+1 LƯỢT'
            : reward.type === 'NOTHING'
            ? 'MAY MẮN'
            : 'QUÀ';
        ctx.fillText(typeLabel, radius - 28, 15);

        ctx.restore();
      });

      // 3. Vẽ các chốt đinh kim loại (Pins) ở rìa vòng quay
      for (let i = 0; i < numSlices * 2; i++) {
        const pinAngle = (i * Math.PI) / numSlices;
        const pinX = Math.cos(pinAngle) * (radius - 4);
        const pinY = Math.sin(pinAngle) * (radius - 4);

        ctx.beginPath();
        ctx.arc(pinX, pinY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#fde047'; // Vàng kim loại
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();

      // 4. Vẽ Vòng viền ngoài LED Neon phát sáng (Outer Rim)
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#2a0c28';
      ctx.stroke();

      // Viền kim loại mạ vàng
      ctx.beginPath();
      ctx.arc(center, center, radius + 15, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Đèn LED tròn viền ngoài
      const numLeds = 24;
      const ledTime = Date.now() / 300;
      for (let i = 0; i < numLeds; i++) {
        const ledAngle = (i * 2 * Math.PI) / numLeds;
        const ledX = center + Math.cos(ledAngle) * (radius + 8);
        const ledY = center + Math.sin(ledAngle) * (radius + 8);

        const isLedActive = (Math.floor(ledTime) + i) % 2 === 0;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = isLedActive ? '#fbbf24' : '#ef4444';
        ctx.shadowColor = isLedActive ? '#fbbf24' : '#ef4444';
        ctx.shadowBlur = isLedActive ? 10 : 3;
        ctx.fill();
      }
      ctx.restore();

      // 5. Vẽ Tâm Trục Giữa (Center Hub 3D)
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, 38, 0, 2 * Math.PI);
      const hubGrad = ctx.createLinearGradient(center - 38, center - 38, center + 38, center + 38);
      hubGrad.addColorStop(0, '#fef08a');
      hubGrad.addColorStop(0.5, '#eab308');
      hubGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = hubGrad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Vòng tròn lõi tâm
      ctx.beginPath();
      ctx.arc(center, center, 26, 0, 2 * Math.PI);
      ctx.fillStyle = '#180616';
      ctx.fill();

      // Ngôi sao / Logo chính giữa
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LUCKY', center, center);
      ctx.restore();

      // 6. Vẽ Kim Chỉ (Pointer Needle ở vị trí đỉnh 12h)
      ctx.save();
      const pointerTopY = 6;
      const pointerWidth = 26;
      const pointerHeight = 36;

      ctx.beginPath();
      ctx.moveTo(center - pointerWidth / 2, pointerTopY);
      ctx.lineTo(center + pointerWidth / 2, pointerTopY);
      ctx.lineTo(center, pointerTopY + pointerHeight);
      ctx.closePath();

      const pointerGrad = ctx.createLinearGradient(
        center - pointerWidth / 2,
        pointerTopY,
        center + pointerWidth / 2,
        pointerTopY + pointerHeight
      );
      pointerGrad.addColorStop(0, '#ef4444');
      pointerGrad.addColorStop(0.5, '#f43f5e');
      pointerGrad.addColorStop(1, '#be123c');

      ctx.fillStyle = pointerGrad;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Chốt kim tròn trên đỉnh
      ctx.beginPath();
      ctx.arc(center, pointerTopY + 6, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.restore();
    },
    [rewards]
  );

  // Khởi tạo và vẽ ban đầu
  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [drawWheel]);

  // Xử lý Animation Quay khi Server trả về kết quả
  useEffect(() => {
    if (!isSpinning || targetIndex === null || rewards.length === 0) {
      isSpinningRef.current = false;
      return;
    }

    isSpinningRef.current = true;
    const numSlices = rewards.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // Vị trí kim ở đỉnh 12h (tương đương góc -PI/2 hoặc 3*PI/2)
    // Tâm của lát cắt targetIndex là: targetIndex * sliceAngle + sliceAngle / 2
    // Để tâm lát cắt này dừng tại -PI/2:
    // (rotation + targetCenter) % 2PI = -PI/2 = 3*PI/2
    // => rotation = 3*PI/2 - (targetIndex * sliceAngle + sliceAngle / 2)
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    const pointerAngle = (3 * Math.PI) / 2; // 270 độ (12 giờ)

    // Thêm một độ lệch ngẫu nhiên nhỏ bên trong sector (dao động ±30% kích thước sector)
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.6;
    const baseTargetAngle = pointerAngle - targetSliceCenter + jitter;

    // Số vòng quay tối thiểu (7 - 9 vòng để tạo cảm giác hồi hộp)
    const fullSpins = 8;
    const startAngle = currentRotationRef.current;

    // Chuẩn hóa góc hiện tại
    const normalizedStart = startAngle % (2 * Math.PI);
    let deltaAngle = baseTargetAngle - normalizedStart;
    while (deltaAngle < 0) {
      deltaAngle += 2 * Math.PI;
    }
    const totalRotation = deltaAngle + fullSpins * 2 * Math.PI;
    const targetAngle = startAngle + totalRotation;

    const startTime = performance.now();

    // Easing: Cubic Ease Out (chạy nhanh lúc đầu và giảm tốc cực mượt về sau)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / spinDuration);
      const easedProgress = easeOutCubic(progress);

      const currentAngle = startAngle + totalRotation * easedProgress;
      currentRotationRef.current = currentAngle;

      // Tính sector hiện tại đang quét qua kim để phát âm thanh tick
      const currentSector = Math.floor(
        ((pointerAngle - currentAngle) % (2 * Math.PI) + 2 * Math.PI) / sliceAngle
      ) % numSlices;

      if (currentSector !== lastTickSectorRef.current) {
        lastTickSectorRef.current = currentSector;
        playTickSound();
      }

      drawWheel(currentAngle);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentRotationRef.current = targetAngle;
        drawWheel(targetAngle);
        isSpinningRef.current = false;
        // Chờ 300ms rồi thông báo kết thúc
        setTimeout(() => {
          onSpinEnd();
        }, 300);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, targetIndex, rewards, spinDuration, onSpinEnd, drawWheel, playTickSound]);

  return (
    <div className="relative flex items-center justify-center p-2 select-none">
      {/* Vòng sáng Neon phía sau (Aura Glow) */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-600/25 via-pink-500/20 to-purple-600/25 blur-2xl animate-pulse pointer-events-none" />

      <canvas
        ref={canvasRef}
        width={440}
        height={440}
        className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] md:w-[440px] md:h-[440px] transition-transform duration-300 drop-shadow-[0_0_35px_rgba(244,63,94,0.35)]"
      />
    </div>
  );
}

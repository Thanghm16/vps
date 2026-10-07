import { NextRequest } from 'next/server';
import { getRateLimitsCollection } from '@/lib/db/collections';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Trích xuất IP khách từ headers của Vercel / Proxy
 */
export function getClientIp(request: Request | NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Rate limiting phân tán tối ưu cho Vercel Serverless dựa trên MongoDB TTL
 * @param key Khóa định danh (vd: `login:1.2.3.4`, `register:1.2.3.4`)
 * @param max Số lần request tối đa trong cửa sổ thời gian
 * @param windowSeconds Cửa sổ thời gian (giây)
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const collection = await getRateLimitsCollection();
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);

    const doc = await collection.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { resetAt },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    if (!doc) {
      return { allowed: true, remaining: max - 1, resetInSeconds: windowSeconds };
    }

    const count = doc.count;
    const remainingTime = Math.max(0, Math.ceil((doc.resetAt.getTime() - Date.now()) / 1000));

    if (count > max) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: remainingTime,
      };
    }

    return {
      allowed: true,
      remaining: max - count,
      resetInSeconds: remainingTime,
    };
  } catch (error) {
    console.warn('[RateLimit] Notice:', (error as Error).message);
    // Nếu có sự cố kết nối database tạm thời, cho phép tiếp tục để không block người dùng
    return { allowed: true, remaining: 1, resetInSeconds: 0 };
  }
}

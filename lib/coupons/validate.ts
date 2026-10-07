import { ObjectId } from 'mongodb';
import { getCouponsCollection, getOrdersCollection } from '@/lib/db/collections';
import { CouponDocument } from '@/types/db-coupon';
import { GameAccountDocument } from '@/types/db-account';
import { GameAccount } from '@/types/account';

export interface CouponValidationResult {
  valid: boolean;
  message?: string;
  coupon?: CouponDocument;
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
}

export interface ValidateCouponOptions {
  code: string;
  orderAmount: number;
  account?: GameAccountDocument | GameAccount | null;
  userId?: string | ObjectId | null;
}

/**
 * Kiểm tra và tính toán giảm giá hoàn toàn phía Server-Side.
 * Tuyệt đối không phụ thuộc hoặc tin tưởng bất kỳ giá trị giảm giá nào từ Client gửi lên.
 */
export async function validateCouponServerSide({
  code,
  orderAmount,
  account,
  userId,
}: ValidateCouponOptions): Promise<CouponValidationResult> {
  const defaultFailure = (message: string): CouponValidationResult => ({
    valid: false,
    message,
    discountAmount: 0,
    subtotal: orderAmount,
    finalTotal: orderAmount,
  });

  if (!code || typeof code !== 'string' || !code.trim()) {
    return defaultFailure('Vui lòng nhập mã giảm giá.');
  }

  if (typeof orderAmount !== 'number' || orderAmount <= 0) {
    return defaultFailure('Giá trị đơn hàng không hợp lệ.');
  }

  const cleanCode = code.trim().toUpperCase();

  const couponsCol = await getCouponsCollection();
  const coupon = await couponsCol.findOne({ code: cleanCode });

  // 1. Kiểm tra mã tồn tại
  if (!coupon) {
    return defaultFailure('Mã giảm giá không tồn tại.');
  }

  // 2. Kiểm tra trạng thái kích hoạt
  if (!coupon.isActive) {
    return defaultFailure('Mã giảm giá đã bị vô hiệu hóa.');
  }

  const now = new Date();

  // 3. Kiểm tra thời gian bắt đầu
  if (coupon.startAt && now < new Date(coupon.startAt)) {
    return defaultFailure('Mã giảm giá chưa có hiệu lực.');
  }

  // 4. Kiểm tra thời gian hết hạn
  if (coupon.endAt && now > new Date(coupon.endAt)) {
    return defaultFailure('Mã giảm giá đã hết hạn.');
  }

  // 5. Kiểm tra tổng lượt sử dụng
  if (
    typeof coupon.usageLimit === 'number' &&
    coupon.usageLimit > 0 &&
    (coupon.usedCount || 0) >= coupon.usageLimit
  ) {
    return defaultFailure('Mã giảm giá đã hết lượt sử dụng.');
  }

  // 6. Kiểm tra số lần sử dụng của người dùng hiện tại
  if (
    typeof coupon.usageLimitPerUser === 'number' &&
    coupon.usageLimitPerUser > 0 &&
    userId
  ) {
    const ordersCol = await getOrdersCollection();
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    const userUsageCount = await ordersCol.countDocuments({
      userId: userObjectId,
      couponCode: cleanCode,
      status: { $ne: 'cancelled' },
    });

    if (userUsageCount >= coupon.usageLimitPerUser) {
      return defaultFailure(
        'Bạn đã sử dụng mã giảm giá này quá số lần cho phép.'
      );
    }
  }

  // 7. Kiểm tra giá trị đơn hàng tối thiểu
  const minOrder = coupon.minOrderValue || 0;
  if (orderAmount < minOrder) {
    return defaultFailure(
      `Đơn hàng chưa đạt giá trị tối thiểu ${minOrder.toLocaleString('vi-VN')} ₫ để sử dụng mã.`
    );
  }

  // 8. Kiểm tra điều kiện sản phẩm & danh mục nếu có thông tin tài khoản
  if (account) {
    const accountCode = (account.code || '').toUpperCase();
    const accountId =
      account._id?.toString() || (account as GameAccount).id || '';
    const gameSlug = account.gameSlug || (account as GameAccount).gameId || '';

    // a. Sản phẩm bị loại trừ (Excluded products)
    if (
      Array.isArray(coupon.excludedProducts) &&
      coupon.excludedProducts.length > 0
    ) {
      const isExcluded = coupon.excludedProducts.some((item) => {
        const clean = item.trim().toUpperCase();
        return clean === accountCode || clean === accountId;
      });
      if (isExcluded) {
        return defaultFailure(
          'Mã giảm giá không áp dụng cho tài khoản game này.'
        );
      }
    }

    // b. Sản phẩm được chỉ định áp dụng (Applicable products)
    if (
      Array.isArray(coupon.applicableProducts) &&
      coupon.applicableProducts.length > 0
    ) {
      const isApplicable = coupon.applicableProducts.some((item) => {
        const clean = item.trim().toUpperCase();
        return clean === accountCode || clean === accountId;
      });
      if (!isApplicable) {
        return defaultFailure(
          'Mã giảm giá không áp dụng cho tài khoản game này.'
        );
      }
    }

    // c. Danh mục game áp dụng (Applicable categories)
    if (
      Array.isArray(coupon.applicableCategories) &&
      coupon.applicableCategories.length > 0
    ) {
      const isCategoryApplicable = coupon.applicableCategories.some(
        (cat) => cat.toLowerCase().trim() === gameSlug.toLowerCase().trim()
      );
      if (!isCategoryApplicable) {
        return defaultFailure(
          'Mã giảm giá chỉ áp dụng cho một số danh mục game nhất định.'
        );
      }
    }
  }

  // 9. Tính toán số tiền giảm
  let discountAmount = 0;

  if (coupon.type === 'percentage') {
    const rawDiscount = Math.round((orderAmount * coupon.value) / 100);
    if (
      typeof coupon.maxDiscount === 'number' &&
      coupon.maxDiscount !== null &&
      coupon.maxDiscount > 0
    ) {
      discountAmount = Math.min(rawDiscount, coupon.maxDiscount);
    } else {
      discountAmount = rawDiscount;
    }
  } else if (coupon.type === 'fixed') {
    discountAmount = Math.min(coupon.value, orderAmount);
  }

  // Đảm bảo không giảm vượt quá giá trị đơn hàng và không âm
  discountAmount = Math.max(0, Math.min(discountAmount, orderAmount));
  const finalTotal = Math.max(0, orderAmount - discountAmount);

  return {
    valid: true,
    coupon,
    discountAmount,
    subtotal: orderAmount,
    finalTotal,
  };
}

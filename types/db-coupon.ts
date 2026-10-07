import { ObjectId } from 'mongodb';

export type CouponType = 'percentage' | 'fixed';

export interface CouponDocument {
  _id?: ObjectId;
  code: string;                          // Mã voucher (UPPERCASE, trimmed, unique index)
  description?: string;                  // Mô tả khuyến mãi
  type: CouponType;                     // 'percentage' (%) hoặc 'fixed' (₫)
  value: number;                        // Giá trị giảm (>0, % <= 100)
  minOrderValue: number;                // Giá trị đơn hàng tối thiểu (mặc định 0)
  maxDiscount?: number | null;          // Giảm tối đa cho loại % (null nếu không giới hạn)
  usageLimit?: number | null;           // Tổng lượt sử dụng tối đa (null nếu không giới hạn)
  usedCount: number;                    // Số lượt đã sử dụng thực tế (mặc định 0)
  usageLimitPerUser?: number | null;    // Giới hạn số lần mỗi user được dùng (null nếu không giới hạn)
  startAt?: Date | null;                // Thời gian bắt đầu hiệu lực (null = áp dụng ngay)
  endAt?: Date | null;                  // Thời gian hết hạn (null = vô thời hạn)
  isActive: boolean;                    // Trạng thái bật/tắt (true/false)
  applicableProducts?: string[];        // Danh sách mã nick (#LQ10291, v.v.) áp dụng (rỗng = tất cả)
  applicableCategories?: string[];      // Danh sách gameSlug áp dụng ('lien-quan', v.v.) (rỗng = tất cả)
  excludedProducts?: string[];          // Danh sách mã nick bị loại trừ
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponClientData {
  id: string;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  usageLimitPerUser?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
  status: 'active' | 'inactive' | 'expired';
  applicableProducts?: string[];
  applicableCategories?: string[];
  excludedProducts?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResponse {
  success: boolean;
  message?: string;
  coupon?: {
    code: string;
    type: CouponType;
    value: number;
    description?: string;
    minOrderValue: number;
    maxDiscount?: number | null;
  };
  discountAmount?: number;
  subtotal?: number;
  finalTotal?: number;
}

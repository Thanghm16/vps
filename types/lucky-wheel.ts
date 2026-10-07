import { ObjectId } from 'mongodb';

export type RewardType =
  | 'ACCOUNT'      // Cấp tài khoản game
  | 'COUPON'       // Cấp mã giảm giá
  | 'MONEY'        // Cộng số dư ví VND
  | 'EXTRA_SPIN'   // Cộng thêm lượt quay
  | 'PRODUCT'      // Cấp sản phẩm / vật phẩm
  | 'NOTHING';     // Không trúng thưởng / Chúc bạn may mắn

export type WheelStatus = 'draft' | 'active' | 'inactive' | 'expired';

export type SpinStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';

export type ClaimStatus = 'CLAIMED' | 'FAILED' | 'NOT_APPLICABLE';

export interface LuckyWheelRewardMetadata {
  accountId?: string;             // Reference ID của game account có sẵn
  accountCode?: string;           // Mã nick nếu có
  gameSlug?: string;              // Game áp dụng
  couponCode?: string;            // Mã voucher mẫu nếu dùng coupon có sẵn
  couponDiscountPercent?: number; // % giảm
  couponMaxDiscount?: number;     // Giảm tối đa
  couponMinOrder?: number;        // Đơn hàng tối thiểu
  productName?: string;           // Tên sản phẩm / vật phẩm
  customMessage?: string;         // Lời nhắn đặc biệt khi trúng
}

export interface LuckyWheelReward {
  id: string;                     // Unique identifier (UUID/string)
  name: string;                   // Tên hiển thị của phần thưởng
  type: RewardType;               // Phân loại phần thưởng
  description?: string;           // Mô tả chi tiết
  image?: string;                 // URL hình ảnh đại diện
  color?: string;                 // Mã màu background của sector trên vòng quay (VD: #e11d48)
  textColor?: string;             // Mã màu chữ trên sector (VD: #ffffff)
  value: number;                  // Giá trị (Số tiền VND, % giảm, số lượt quay thêm...)
  quantity: number;               // Tổng số lượng ban đầu (-1 = vô hạn)
  remainingQuantity: number;      // Số lượng còn lại trong kho
  probability: number;            // Xác suất trúng (%) ví dụ: 0.1, 5, 20.4
  enabled: boolean;               // Bật/tắt phần thưởng này
  sortOrder: number;              // Thứ tự hiển thị trên vòng quay (theo chiều kim đồng hồ)
  metadata?: LuckyWheelRewardMetadata;
}

export interface LuckyWheelDocument {
  _id?: ObjectId;
  name: string;                   // Tên sự kiện vòng quay
  slug: string;                   // Slug đường dẫn duy nhất
  description?: string;           // Mô tả chương trình
  thumbnail?: string;             // Ảnh banner / thumbnail
  status: WheelStatus;            // Trạng thái: draft | active | inactive | expired
  startAt?: Date | null;          // Thời gian bắt đầu (null = không giới hạn)
  endAt?: Date | null;            // Thời gian kết thúc (null = không giới hạn)
  spinCost: number;               // Giá mỗi lượt quay (VND). 0 = Miễn phí
  freeSpinsPerUser: number;       // Số lượt quay miễn phí ban đầu cho mỗi user (mặc định 0 hoặc 1)
  dailySpinLimit?: number | null; // Giới hạn lượt quay tối đa/ngày (null = không giới hạn)
  maxSpinsPerUser?: number | null;// Tổng lượt quay tối đa cho 1 user suốt sự kiện (null = không giới hạn)
  requireLogin: boolean;          // Yêu cầu đăng nhập để quay (mặc định true)
  enabled: boolean;               // Bật/tắt vòng quay
  rewards: LuckyWheelReward[];    // Danh sách các phần thưởng trên vòng quay
  rules?: string;                 // Thể lệ chi tiết (Markdown hoặc HTML)
  seoTitle?: string;              // SEO Meta Title
  seoDescription?: string;        // SEO Meta Description
  seoKeywords?: string;           // SEO Meta Keywords
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Theo dõi số lượt quay của từng user trên từng vòng quay
 */
export interface LuckyWheelUserStatDocument {
  _id?: ObjectId;
  userId: ObjectId;
  wheelId: ObjectId;
  freeSpinsUsed: number;          // Số lượt miễn phí đã dùng
  bonusSpins: number;             // Số lượt thưởng được cộng thêm từ EXTRA_SPIN
  totalSpins: number;             // Tổng số lượt đã quay từ trước đến nay
  dailyDate: string;              // Ngày hiện tại theo định dạng YYYY-MM-DD
  dailySpinsCount: number;        // Số lượt đã quay trong ngày hôm nay
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bản ghi chi tiết mỗi lượt quay (LuckyWheelSpin)
 */
export interface LuckyWheelSpinDocument {
  _id?: ObjectId;
  idempotencyKey?: string;        // Khóa idempotent chống duplicate request từ client
  wheelId: ObjectId;
  wheelName: string;
  userId: ObjectId;
  username: string;
  customerName?: string;
  rewardId: string;
  rewardName: string;
  rewardType: RewardType;
  rewardValue: number;
  rewardImage?: string;
  spinNumber: number;             // Số thứ tự lượt quay của user trên vòng quay
  cost: number;                   // Chi phí thực tế đã thanh toán (0 nếu dùng lượt free/bonus)
  costType: 'free' | 'bonus' | 'wallet';
  status: SpinStatus;             // SUCCESS | FAILED | PENDING | CANCELLED
  claimStatus: ClaimStatus;       // CLAIMED | FAILED | NOT_APPLICABLE
  claimDetails?: {
    orderCode?: string;
    accountCode?: string;
    couponCode?: string;
    transactionCode?: string;
    extraSpinsAdded?: number;
    balanceAdded?: number;
    note?: string;
  };
  ip?: string;
  createdAt: Date;
}

/**
 * Dữ liệu vòng quay sanitized gửi về cho public client (loại bỏ thông tin nhạy cảm)
 */
export interface LuckyWheelClientData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  status: WheelStatus;
  startAt?: string | null;
  endAt?: string | null;
  spinCost: number;
  freeSpinsPerUser: number;
  dailySpinLimit?: number | null;
  maxSpinsPerUser?: number | null;
  requireLogin: boolean;
  enabled: boolean;
  rewards: Array<{
    id: string;
    name: string;
    type: RewardType;
    description?: string;
    image?: string;
    color?: string;
    textColor?: string;
    value: number;
    sortOrder: number;
  }>;
  rules?: string;
  seoTitle?: string;
  seoDescription?: string;
  userStats?: {
    freeSpinsRemaining: number;
    bonusSpinsRemaining: number;
    totalAvailableSpins: number;
    dailySpinsRemaining: number | null;
    totalSpinsUsed: number;
  };
}

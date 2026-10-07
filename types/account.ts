import { AccountCredentials } from './db-account';

export type GameCategory = 
  | 'all'
  | 'lien-quan'
  | 'free-fire'
  | 'pubg'
  | 'valorant'
  | 'fc-online'
  | 'toc-chien'
  | 'other';

export type AccountStatus = 'available' | 'sold' | 'reserved' | 'hidden';

export interface GameAccount {
  id: string;
  _id?: string;
  code: string;              // Mã nick: e.g. "#LQ10291", "#VAL-8821"
  gameId: GameCategory | string; // ID Danh mục game
  gameSlug?: string;         // Slug danh mục game trong DB
  gameName: string;          // Tên game: "Liên Quân Mobile", "Valorant", etc.
  title: string;             // Tiêu đề: "Nick Cao Thủ Full Tướng 247 Skin SSS"
  slug?: string;             // Đường dẫn SEO: "nick-lien-quan-cao-thu-10291"
  thumbnail: string;         // Ảnh hiển thị chính (aspect-square / 16:9)
  images: string[];          // Bộ sưu tập ảnh chi tiết (tướng, skin, kho đồ, thông tin rank)
  price: number;             // Giá bán hiện tại (VND)
  originalPrice: number;     // Giá gốc trước giảm (VND)
  discountPercent?: number;  // % giảm giá (vd: 25)
  rank?: string;             // Rank tài khoản (nếu có)
  level?: number;            // Level tài khoản (nếu có)
  heroCount?: number;        // Số tướng sở hữu (nếu có)
  championsCount?: number;   // Alias số tướng sở hữu
  skinCount?: number;        // Số trang phục / skin sở hữu
  skinsCount?: number;       // Alias số trang phục sở hữu
  rareSkinCount?: number;    // Số skin hiếm / VIP / giới hạn
  rareSkins?: string[];      // Danh sách tên skin hiếm
  server?: string;           // Server (nếu có)
  loginType?: string;        // Hình thức đăng nhập (nếu có)
  tags?: string[];           // Tags nổi bật
  highlights?: string[];     // Danh sách đặc điểm nổi bật
  featuredSkins?: string[];  // Danh sách các skin đắt giá nhất trong nick
  description?: string;      // Mô tả chi tiết nick
  status: AccountStatus;     // Trạng thái
  isVerified: boolean;       // Đã kiểm duyệt uy tín bởi admin
  isFeatured: boolean;       // Hiển thị ở Hero Banner hoặc Section nổi bật
  isHot?: boolean;           // Hiển thị trong mục "Nick Hot Hôm Nay"
  views: number;             // Số lượt xem
  rating?: number;           // Điểm đánh giá (vd 4.9)
  reviewCount?: number;      // Số lượt đánh giá
  warrantyPolicy?: string;   // Placeholder chính sách bảo hành
  details?: Record<string, unknown>; // Mixed object linh hoạt
  credentials?: AccountCredentials;
  createdAt?: string;        // Ngày tạo / đăng bán
  updatedAt?: string;        // Ngày cập nhật
}

export interface CategoryTab {
  id: GameCategory;
  name: string;
  iconName?: string;
  count?: number;
}

export interface HeroAccountSlide {
  id: string;
  accountCode: string;
  gameName: string;
  title: string;
  subtitle: string;
  description: string;
  bannerImage: string;
  tags: string[];
  price: number;
  originalPrice: number;
  discountBadge: string;
  slideNumber: string;
  accountSlug: string;
}

export interface TopDepositor {
  rank: number;
  name: string;
  avatar: string;
  amount: number;
  vipTier: string;
  transactionsCount: number;
  badgeColor?: string;
}

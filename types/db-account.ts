import { ObjectId } from 'mongodb';
import { GameAccount } from './account';

export interface AccountCredentials {
  loginUsername?: string;
  loginPassword?: string;
  twoFactorCode?: string;
  emailBound?: string;
  phoneBound?: string;
  note?: string;
}

export interface GameCategoryDocument {
  _id?: ObjectId;
  name: string;
  slug: string;
  accountsCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GameAccountDocument {
  _id?: ObjectId;
  code: string;
  gameSlug: string;
  gameName: string;
  title: string;
  slug?: string;
  price: number;
  originalPrice: number;
  discountPercent?: number;
  thumbnail: string;
  images: string[];
  tags: string[];
  highlights?: string[];
  description: string;
  status: 'available' | 'sold' | 'reserved' | 'hidden';
  isVerified: boolean;
  isFeatured: boolean;
  isHot: boolean;
  views: number;
  salesCount?: number;
  rating?: number;
  reviewCount?: number;
  reviewsCount?: number;
  warrantyPolicy?: string;

  /**
   * MongoDB Mixed Type: Lưu trữ thông tin chi tiết và mọi thuộc tính linh hoạt của nick
   */
  details: Record<string, unknown>;

  /**
   * Thông tin bàn giao bảo mật (chỉ trả về cho admin hoặc khách mua thành công)
   */
  credentials?: AccountCredentials;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Chuyển đổi GameAccountDocument thành dữ liệu an toàn cho Storefront công khai
 * TUYỆT ĐỐI LOẠI BỎ trường credentials, giữ nguyên Object `details` thực tế
 * và chỉ hiển thị đúng những thông tin sản phẩm thực sự sở hữu.
 */
export function serializePublicAccount(doc: GameAccountDocument): GameAccount {
  const rest = { ...doc };
  delete rest.credentials;
  const details = (doc.details || {}) as Record<string, unknown>;

  return {
    ...rest,
    details, // Giữ nguyên Object thuộc tính thực tế
    rank: (details.rank as string) || (details['Xếp hạng'] as string) || (details['Rank'] as string) || undefined,
    level: (details.level as number) || (details['Cấp độ'] as number) || (details['Level'] as number) || undefined,
    server: (details.server as string) || (details['Máy chủ'] as string) || (details['Server'] as string) || undefined,
    loginType: (details.loginType as string) || (details['Đăng nhập'] as string) || undefined,
    heroCount: (details.heroCount as number) ?? (details.championsCount as number) ?? (details['Số tướng'] as number) ?? undefined,
    championsCount: (details.championsCount as number) ?? (details.heroCount as number) ?? (details['Số tướng'] as number) ?? undefined,
    skinCount: (details.skinCount as number) ?? (details.skinsCount as number) ?? (details['Số trang phục'] as number) ?? undefined,
    skinsCount: (details.skinsCount as number) ?? (details.skinCount as number) ?? (details['Số trang phục'] as number) ?? undefined,
    rareSkinCount: (details.rareSkinCount as number) || (Array.isArray(details.rareSkins) ? details.rareSkins.length : undefined),
    rareSkins: Array.isArray(details.rareSkins) ? (details.rareSkins as string[]) : undefined,
    featuredSkins: Array.isArray(details.featuredSkins) ? (details.featuredSkins as string[]) : undefined,
    slug: doc.slug || doc.code.toLowerCase().replace(/[^a-z0-9]/g, ''),
    gameId: doc.gameSlug,
    id: doc._id ? doc._id.toString() : doc.code,
    _id: doc._id ? doc._id.toString() : undefined,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}

import { Collection } from 'mongodb';
import { getDatabase } from './mongodb';
import {
  UserDocument,
  SessionDocument,
  PasswordResetDocument,
  RateLimitDocument,
} from '@/types/auth';
import { GameAccountDocument, GameCategoryDocument } from '@/types/db-account';
import { SystemSettingsDocument } from '@/types/admin';
import { TransactionDocument } from '@/types/db-transaction';
import { OrderDocument } from '@/types/db-order';
import { CouponDocument } from '@/types/db-coupon';
import { BannerDocument } from '@/types/db-banner';
import { FavoriteDocument } from '@/types/db-favorite';
import { NewsDocument, NewsCategoryDocument } from '@/types/db-news';
import {
  LuckyWheelDocument,
  LuckyWheelSpinDocument,
  LuckyWheelUserStatDocument,
} from '@/types/lucky-wheel';

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<UserDocument>('users');
}

export async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<SessionDocument>('sessions');
}

export async function getPasswordResetsCollection(): Promise<Collection<PasswordResetDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<PasswordResetDocument>('password_resets');
}

export async function getRateLimitsCollection(): Promise<Collection<RateLimitDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<RateLimitDocument>('rate_limits');
}

export async function getGamesCollection(): Promise<Collection<GameCategoryDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<GameCategoryDocument>('games');
}

export async function getAccountsCollection(): Promise<Collection<GameAccountDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<GameAccountDocument>('accounts');
}

export async function getTransactionsCollection(): Promise<Collection<TransactionDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<TransactionDocument>('transactions');
}

export async function getOrdersCollection(): Promise<Collection<OrderDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<OrderDocument>('orders');
}

export interface ReviewDocument {
  _id?: any;
  userId?: any;
  username: string;
  userAvatar?: string;
  rating: number;
  accountBought: string;
  comment: string;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getReviewsCollection(): Promise<Collection<ReviewDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<ReviewDocument>('reviews');
}

export async function getCouponsCollection(): Promise<Collection<CouponDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<CouponDocument>('coupons');
}

export async function getBannersCollection(): Promise<Collection<BannerDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<BannerDocument>('banners');
}

export async function getFavoritesCollection(): Promise<Collection<FavoriteDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<FavoriteDocument>('favorites');
}

export async function getSettingsCollection(): Promise<Collection<SystemSettingsDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<SystemSettingsDocument>('settings');
}

export async function getNewsCategoriesCollection(): Promise<Collection<NewsCategoryDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<NewsCategoryDocument>('news_categories');
}

export async function getNewsCollection(): Promise<Collection<NewsDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<NewsDocument>('news');
}

export async function getLuckyWheelsCollection(): Promise<Collection<LuckyWheelDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<LuckyWheelDocument>('lucky_wheels');
}

export async function getLuckyWheelSpinsCollection(): Promise<Collection<LuckyWheelSpinDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<LuckyWheelSpinDocument>('lucky_wheel_spins');
}

export async function getLuckyWheelUserStatsCollection(): Promise<Collection<LuckyWheelUserStatDocument>> {
  const db = await getDatabase();
  await ensureIndexes();
  return db.collection<LuckyWheelUserStatDocument>('lucky_wheel_user_stats');
}

let indexesCreated = false;
let indexingPromise: Promise<void> | null = null;

export async function ensureIndexes(): Promise<void> {
  if (indexesCreated) return;
  if (indexingPromise) return indexingPromise;

  indexingPromise = (async () => {
    try {
      const db = await getDatabase();

      // 1. Users collection indexes
      const users = db.collection<UserDocument>('users');
      await users.createIndex({ email: 1 }, { unique: true });
      await users.createIndex({ username: 1 }, { unique: true });
      await users.createIndex({ userCode: 1 }, { unique: true, sparse: true });
      await users.createIndex({ role: 1 });

      // 2. Sessions collection indexes (with TTL for expiresAt)
      const sessions = db.collection<SessionDocument>('sessions');
      await sessions.createIndex({ userId: 1 });
      await sessions.createIndex({ refreshTokenHash: 1 });
      await sessions.createIndex({ familyId: 1 });
      await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // 3. Password Resets collection indexes (with TTL for expiresAt)
      const passwordResets = db.collection<PasswordResetDocument>('password_resets');
      await passwordResets.createIndex({ tokenHash: 1 });
      await passwordResets.createIndex({ email: 1 });
      await passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // 4. Rate Limits collection indexes (with TTL for resetAt)
      const rateLimits = db.collection<RateLimitDocument>('rate_limits');
      await rateLimits.createIndex({ key: 1 }, { unique: true });
      await rateLimits.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });

      // 5. Games collection indexes (Tối giản: slug độc nhất)
      const games = db.collection<GameCategoryDocument>('games');
      await games.createIndex({ slug: 1 }, { unique: true });

      // 6. Accounts collection indexes (Mã code độc nhất, tìm kiếm theo game, status, giá)
      const accounts = db.collection<GameAccountDocument>('accounts');
      await accounts.createIndex({ code: 1 }, { unique: true });
      await accounts.createIndex({ slug: 1 }, { sparse: true });
      await accounts.createIndex({ gameSlug: 1 });
      await accounts.createIndex({ status: 1 });
      await accounts.createIndex({ price: 1 });
      await accounts.createIndex({ createdAt: -1 });
      await accounts.createIndex({ isFeatured: 1 });
      // Compound indexes cho SEO landing pages & bộ lọc kho nick hiệu suất cao
      await accounts.createIndex({ gameSlug: 1, status: 1, createdAt: -1 });
      await accounts.createIndex({ status: 1, price: 1 });
      await accounts.createIndex({ status: 1, isFeatured: 1, createdAt: -1 });

      // 7. Settings collection indexes (key độc nhất cho singleton config)
      const settings = db.collection<SystemSettingsDocument>('settings');
      await settings.createIndex({ key: 1 }, { unique: true });

      // 8. Transactions collection indexes (sepayId unique chống trùng lặp, mã giao dịch code unique)
      const transactions = db.collection<TransactionDocument>('transactions');
      await transactions.createIndex({ sepayId: 1 }, { unique: true, sparse: true });
      await transactions.createIndex({ code: 1 }, { unique: true });
      await transactions.createIndex({ createdAt: -1 });
      await transactions.createIndex({ paymentCode: 1 });

      // 9. Orders collection indexes (code unique, accountCode)
      const orders = db.collection<OrderDocument>('orders');
      await orders.createIndex({ code: 1 }, { unique: true });
      await orders.createIndex({ accountCode: 1 });
      await orders.createIndex({ status: 1 });
      await orders.createIndex({ createdAt: -1 });
      await orders.createIndex({ couponCode: 1 });

      // 10. Coupons collection indexes (mã code độc nhất không phân biệt hoa thường)
      const coupons = db.collection<CouponDocument>('coupons');
      await coupons.createIndex({ code: 1 }, { unique: true });
      await coupons.createIndex({ isActive: 1 });
      await coupons.createIndex({ endAt: 1 });
      await coupons.createIndex({ createdAt: -1 });

      // 11. Banners collection indexes (sortOrder, isActive, thời gian hiển thị)
      const banners = db.collection<BannerDocument>('banners');
      await banners.createIndex({ isActive: 1, sortOrder: 1 });
      await banners.createIndex({ startAt: 1, endAt: 1 });
      await banners.createIndex({ createdAt: -1 });

      // 12. Favorites collection indexes (Compound Unique chống duplicate race condition)
      const favorites = db.collection<FavoriteDocument>('favorites');
      await favorites.createIndex({ userId: 1, accountId: 1 }, { unique: true });
      await favorites.createIndex({ userId: 1, accountCode: 1 }, { unique: true });
      await favorites.createIndex({ userId: 1, createdAt: -1 });

      // 13. News Categories indexes
      const newsCategories = db.collection<NewsCategoryDocument>('news_categories');
      await newsCategories.createIndex({ slug: 1 }, { unique: true });
      await newsCategories.createIndex({ status: 1, sortOrder: 1 });

      // 14. News collection indexes
      const news = db.collection<NewsDocument>('news');
      await news.createIndex({ slug: 1 }, { unique: true });
      await news.createIndex({ status: 1, publishedAt: -1 });
      await news.createIndex({ categoryId: 1, status: 1, publishedAt: -1 });
      await news.createIndex({ isFeatured: 1, status: 1, publishedAt: -1 });
      await news.createIndex({ isPinned: 1, status: 1, publishedAt: -1 });
      await news.createIndex({ createdAt: -1 });
      await news.createIndex({ views: -1 });

      // 15. Lucky Wheels collection indexes
      const luckyWheels = db.collection<LuckyWheelDocument>('lucky_wheels');
      await luckyWheels.createIndex({ slug: 1 }, { unique: true });
      await luckyWheels.createIndex({ status: 1, enabled: 1 });
      await luckyWheels.createIndex({ startAt: 1, endAt: 1 });
      await luckyWheels.createIndex({ createdAt: -1 });

      // 16. Lucky Wheel Spins collection indexes
      const luckyWheelSpins = db.collection<LuckyWheelSpinDocument>('lucky_wheel_spins');
      await luckyWheelSpins.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
      await luckyWheelSpins.createIndex({ wheelId: 1, createdAt: -1 });
      await luckyWheelSpins.createIndex({ userId: 1, createdAt: -1 });
      await luckyWheelSpins.createIndex({ wheelId: 1, userId: 1, createdAt: -1 });
      await luckyWheelSpins.createIndex({ createdAt: -1 });

      // 17. Lucky Wheel User Stats indexes
      const luckyWheelUserStats = db.collection<LuckyWheelUserStatDocument>('lucky_wheel_user_stats');
      await luckyWheelUserStats.createIndex({ userId: 1, wheelId: 1 }, { unique: true });

      indexesCreated = true;
    } catch (error) {
      // Không làm crash server nếu index đã tồn tại hoặc đang khởi động
      console.warn('[MongoDB] Index creation notice:', (error as Error).message);
    } finally {
      indexingPromise = null;
    }
  })();

  return indexingPromise;
}

import type { ObjectId } from 'mongodb';
import { S3StorageConfig, BankAccountConfig } from './admin';

export interface ImageAsset {
  url: string;
  key?: string;
  publicId?: string;
  size?: number;
  alt?: string;
  width?: number;
  height?: number;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: 'GameStore VN - Sàn Mua Bán Nick Game Tự Động',
  brandName: 'Game STORE',
  siteDescription:
    'Sàn thương mại điện tử chuyên mua bán tài khoản, nick game Liên Quân, Valorant, Free Fire, PUBG Mobile, FC Online uy tín số 1 Việt Nam. Bàn giao tự động 24/7.',
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://gamestore.vn',
  logo: undefined,
  favicon: undefined,
  seo: {
    title: 'GameStore - Marketplace Mua Bán Tài Khoản & Nick Game Uy Tín',
    description:
      'Sàn giao dịch tài khoản, nick game Liên Quân Mobile, Free Fire, Valorant, PUBG Mobile, FC Online, Tốc Chiến uy tín, giao dịch tự động 24/7.',
    keywords: [
      'mua nick game',
      'nick lien quan',
      'acc valorant',
      'acc free fire',
      'shop game uy tin',
      'nap tien tu dong',
      'gamestore',
    ],
    ogImage: undefined,
    canonicalUrl: '',
  },
  contact: {
    email: 'hotro@gamestore.vn',
    phone: '1900 8888',
    zalo: '0988.888.999',
    address: 'Tòa Nhà Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm, Hà Nội',
  },
  social: {
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
    tiktok: 'https://tiktok.com',
    telegram: 'https://t.me',
    zalo: 'https://zalo.me',
  },
  footer: {
    description:
      'Sàn thương mại điện tử chuyên cung cấp tài khoản, nick game bản quyền uy tín hàng đầu. Hệ thống duyệt đơn tự động 24/7, bảo mật thông tin tuyệt đối và cam kết bảo hành đổi trả minh bạch.',
    copyright: '© 2026 GameStore.vn — Sàn giao dịch tài khoản game tự động uy tín & an toàn nhất Việt Nam.',
  },
  announcement: {
    enabled: true,
    text: '🔥 SIÊU SALE NICK VIP LIÊN QUÂN, VALORANT, FREE FIRE - BÀN GIAO TỰ ĐỘNG 24/7!',
    link: '/#kho-nick',
  },
  maintenance: {
    enabled: false,
    message: 'Hệ thống đang được nâng cấp bảo trì định kỳ để nâng cao chất lượng dịch vụ. Vui lòng quay lại sau ít phút!',
  },
  googleAuth: {
    enabled: false,
    clientId: '',
  },
};

export interface WebsiteSettings {
  // 1. Thông tin chung
  siteName: string;
  brandName: string;
  siteDescription: string;
  siteUrl: string;

  // 2. Thương hiệu (Logo & Favicon) - KHÔNG CÓ MÀU SẮC THEO YÊU CẦU
  logo?: ImageAsset;
  favicon?: ImageAsset;

  // 3. SEO & Open Graph
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: ImageAsset;
    canonicalUrl?: string;
  };

  // 4. Thông tin liên hệ
  contact: {
    email: string;
    phone: string;
    zalo: string;
    address: string;
  };

  // 5. Mạng xã hội (URL đã validate an toàn)
  social: {
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    telegram?: string;
    zalo?: string;
  };

  // 6. Header & Footer
  footer: {
    description: string;
    copyright: string;
  };

  // 7. Announcement Bar
  announcement: {
    enabled: boolean;
    text: string;
    link?: string;
  };

  // 8. Chế độ bảo trì
  maintenance: {
    enabled: boolean;
    message: string;
  };

  // 9. Google OAuth 2.0
  googleAuth?: {
    enabled: boolean;
    clientId: string;
  };
}

export interface PublicWebsiteSettings extends WebsiteSettings {
  // Public-safe view of settings for frontend consumers
}

export interface GoogleAuthConfig {
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
}

export const DEFAULT_GOOGLE_AUTH_CONFIG: GoogleAuthConfig = {
  enabled: false,
  clientId: '',
  clientSecret: '',
};

export interface TelegramBotConfig {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
  notifyDeposit: boolean;
  notifyOrder: boolean;
  notifyLowStock: boolean;
  lowStockThreshold: number; // Ngưỡng số lượng nick còn lại để cảnh báo (mặc định: 3)
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramBotConfig = {
  enabled: false,
  botToken: '',
  chatId: '',
  notifyDeposit: true,
  notifyOrder: true,
  notifyLowStock: true,
  lowStockThreshold: 3,
};

export interface FullSystemSettingsDocument extends WebsiteSettings {
  _id?: ObjectId;
  key: string; // 'system_settings'
  
  // Vận hành sàn & bảo hành
  defaultWarrantyDays: number;
  autoDelivery: boolean;
  minDepositAmount: number;

  // S3 Cloudfly & Payment SePay
  s3: S3StorageConfig;
  payment?: {
    sepayApiKey?: string;
    sepayActive?: boolean;
    momoPartnerCode?: string;
    momoActive?: boolean;
    depositPrefix?: string;
    buyPrefix?: string;
    bankAccounts?: BankAccountConfig[];
  };

  // Telegram Bot thông báo tự động
  telegram?: TelegramBotConfig;

  // Google OAuth 2.0 Đăng nhập
  googleAuth?: GoogleAuthConfig;

  createdAt?: Date;
  updatedAt: Date;
}

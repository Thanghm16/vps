import { cache } from 'react';
import { getSettingsCollection } from './collections';
import { DEFAULT_S3_CONFIG } from '@/lib/s3/cloudfly';
import {
  PublicWebsiteSettings,
  FullSystemSettingsDocument,
  DEFAULT_WEBSITE_SETTINGS,
  DEFAULT_TELEGRAM_CONFIG,
} from '@/types/settings';

export { DEFAULT_WEBSITE_SETTINGS, DEFAULT_TELEGRAM_CONFIG };

// In-memory TTL cache (15 seconds) for high-frequency serverless invocations
let cachedSettings: FullSystemSettingsDocument | null = null;
let cachedSettingsExpiry = 0;

export function invalidateWebsiteSettingsCache(): void {
  cachedSettings = null;
  cachedSettingsExpiry = 0;
}

/**
 * Lấy WebsiteSettings đầy đủ từ MongoDB (Memoized per-request bằng React.cache và có short in-memory cache)
 */
export const getWebsiteSettingsFromDb = cache(async (): Promise<FullSystemSettingsDocument> => {
  const now = Date.now();
  if (cachedSettings && cachedSettingsExpiry > now) {
    return cachedSettings;
  }

  try {
    const settingsCol = await getSettingsCollection();
    const doc = (await settingsCol.findOne({ key: 'system_settings' })) as any;

    let result: FullSystemSettingsDocument;

    if (!doc) {
      result = {
        ...DEFAULT_WEBSITE_SETTINGS,
        key: 'system_settings',
        defaultWarrantyDays: 7,
        autoDelivery: true,
        minDepositAmount: 10000,
        s3: DEFAULT_S3_CONFIG,
        telegram: DEFAULT_TELEGRAM_CONFIG,
        updatedAt: new Date(),
      };
    } else {
      result = {
        key: 'system_settings',
        siteName: doc.siteName || doc.storeName || DEFAULT_WEBSITE_SETTINGS.siteName,
        brandName: doc.brandName || DEFAULT_WEBSITE_SETTINGS.brandName,
        siteDescription: doc.siteDescription || doc.storeSlogan || DEFAULT_WEBSITE_SETTINGS.siteDescription,
        siteUrl: doc.siteUrl || DEFAULT_WEBSITE_SETTINGS.siteUrl,
        logo: doc.logo?.url ? doc.logo : undefined,
        favicon: doc.favicon?.url ? doc.favicon : undefined,
        seo: {
          title: doc.seo?.title || doc.siteName || doc.storeName || DEFAULT_WEBSITE_SETTINGS.seo.title,
          description:
            doc.seo?.description || doc.siteDescription || doc.storeSlogan || DEFAULT_WEBSITE_SETTINGS.seo.description,
          keywords: Array.isArray(doc.seo?.keywords) && doc.seo.keywords.length > 0
            ? doc.seo.keywords
            : DEFAULT_WEBSITE_SETTINGS.seo.keywords,
          ogImage: doc.seo?.ogImage?.url ? doc.seo.ogImage : undefined,
          canonicalUrl: doc.seo?.canonicalUrl || '',
        },
        contact: {
          email: doc.contact?.email || doc.supportEmail || DEFAULT_WEBSITE_SETTINGS.contact.email,
          phone: doc.contact?.phone || doc.hotline || DEFAULT_WEBSITE_SETTINGS.contact.phone,
          zalo: doc.contact?.zalo || DEFAULT_WEBSITE_SETTINGS.contact.zalo,
          address: doc.contact?.address || doc.address || DEFAULT_WEBSITE_SETTINGS.contact.address,
        },
        social: {
          facebook: doc.social?.facebook || DEFAULT_WEBSITE_SETTINGS.social.facebook,
          youtube: doc.social?.youtube || DEFAULT_WEBSITE_SETTINGS.social.youtube,
          tiktok: doc.social?.tiktok || DEFAULT_WEBSITE_SETTINGS.social.tiktok,
          telegram: doc.social?.telegram || DEFAULT_WEBSITE_SETTINGS.social.telegram,
          zalo: doc.social?.zalo || DEFAULT_WEBSITE_SETTINGS.social.zalo,
        },
        footer: {
          description: doc.footer?.description || DEFAULT_WEBSITE_SETTINGS.footer.description,
          copyright: doc.footer?.copyright || DEFAULT_WEBSITE_SETTINGS.footer.copyright,
        },
        announcement: {
          enabled: doc.announcement?.enabled !== undefined ? Boolean(doc.announcement.enabled) : doc.announcement ? true : false,
          text: typeof doc.announcement === 'string' ? doc.announcement : doc.announcement?.text || DEFAULT_WEBSITE_SETTINGS.announcement.text,
          link: typeof doc.announcement === 'object' && doc.announcement !== null && typeof doc.announcement.link === 'string' ? doc.announcement.link : DEFAULT_WEBSITE_SETTINGS.announcement.link,
        },
        maintenance: {
          enabled: doc.maintenance?.enabled !== undefined ? Boolean(doc.maintenance.enabled) : Boolean(doc.maintenanceMode),
          message: doc.maintenance?.message || DEFAULT_WEBSITE_SETTINGS.maintenance.message,
        },
        defaultWarrantyDays: doc.defaultWarrantyDays ?? 7,
        autoDelivery: doc.autoDelivery ?? true,
        minDepositAmount: doc.minDepositAmount ?? 10000,
        s3: doc.s3 || DEFAULT_S3_CONFIG,
        payment: {
          sepayApiKey: doc.payment?.sepayApiKey || '',
          sepayActive: doc.payment?.sepayActive !== undefined ? Boolean(doc.payment.sepayActive) : true,
          momoPartnerCode: doc.payment?.momoPartnerCode || '',
          momoActive: doc.payment?.momoActive !== undefined ? Boolean(doc.payment.momoActive) : false,
          depositPrefix: doc.payment?.depositPrefix || 'NAP',
          buyPrefix: doc.payment?.buyPrefix || 'BUY',
          bankAccounts: Array.isArray(doc.payment?.bankAccounts) ? doc.payment.bankAccounts : [],
        },
        telegram: {
          enabled: Boolean(doc.telegram?.enabled),
          botToken: doc.telegram?.botToken || '',
          chatId: doc.telegram?.chatId || '',
          notifyDeposit: doc.telegram?.notifyDeposit !== undefined ? Boolean(doc.telegram.notifyDeposit) : true,
          notifyOrder: doc.telegram?.notifyOrder !== undefined ? Boolean(doc.telegram.notifyOrder) : true,
          notifyLowStock: doc.telegram?.notifyLowStock !== undefined ? Boolean(doc.telegram.notifyLowStock) : true,
          lowStockThreshold: Number(doc.telegram?.lowStockThreshold) || 3,
        },
        googleAuth: {
          enabled: doc.googleAuth?.enabled !== undefined ? Boolean(doc.googleAuth.enabled) : doc.googleAuth?.clientId ? true : false,
          clientId: doc.googleAuth?.clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          clientSecret: doc.googleAuth?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
        },
        updatedAt: doc.updatedAt || new Date(),
      };
    }

    cachedSettings = result;
    cachedSettingsExpiry = now + 15000; // 15 seconds in-memory cache
    return result;
  } catch (error) {
    console.warn('[WebsiteSettings] Error fetching settings from DB, using defaults:', error);
    return {
      ...DEFAULT_WEBSITE_SETTINGS,
      key: 'system_settings',
      defaultWarrantyDays: 7,
      autoDelivery: true,
      minDepositAmount: 10000,
      s3: DEFAULT_S3_CONFIG,
      telegram: DEFAULT_TELEGRAM_CONFIG,
      googleAuth: {
        enabled: false,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      updatedAt: new Date(),
    };
  }
});

/**
 * Lọc dữ liệu công khai an toàn cho Client (loại bỏ s3 credentials, sepay keys, google client secret)
 */
export function extractPublicSettings(doc: FullSystemSettingsDocument): PublicWebsiteSettings {
  return {
    siteName: doc.siteName,
    brandName: doc.brandName,
    siteDescription: doc.siteDescription,
    siteUrl: doc.siteUrl,
    logo: doc.logo,
    favicon: doc.favicon,
    seo: doc.seo,
    contact: doc.contact,
    social: doc.social,
    footer: doc.footer,
    announcement: doc.announcement,
    maintenance: doc.maintenance,
    googleAuth: {
      enabled: doc.googleAuth?.enabled !== undefined ? Boolean(doc.googleAuth.enabled) : Boolean(doc.googleAuth?.clientId),
      clientId: doc.googleAuth?.clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
  };
}

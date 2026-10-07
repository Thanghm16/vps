import { NextResponse } from 'next/server';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getSettingsCollection } from '@/lib/db/collections';
import { getWebsiteSettingsFromDb, invalidateWebsiteSettingsCache, DEFAULT_WEBSITE_SETTINGS } from '@/lib/db/settings';
import { DEFAULT_S3_CONFIG } from '@/lib/s3/cloudfly';

export const runtime = 'nodejs';

function sanitizeUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string' || !url.trim()) return undefined;
  const trimmed = url.trim();
  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getWebsiteSettingsFromDb();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin Settings GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải cấu hình: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleUpdateSettings(request);
}

export async function PATCH(request: Request) {
  return handleUpdateSettings(request);
}

async function handleUpdateSettings(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = (await request.json()) as any;
    const settingsCol = await getSettingsCollection();
    const currentDoc = ((await settingsCol.findOne({ key: 'system_settings' })) as any) || {};

    // 1. Validate & Sanitize S3 Config
    const s3Config = {
      endpoint: (body.s3?.endpoint || currentDoc.s3?.endpoint || DEFAULT_S3_CONFIG.endpoint).trim(),
      region: (body.s3?.region || currentDoc.s3?.region || DEFAULT_S3_CONFIG.region).trim(),
      accessKeyId: (body.s3?.accessKeyId !== undefined ? body.s3.accessKeyId : currentDoc.s3?.accessKeyId || '').trim(),
      secretAccessKey: (body.s3?.secretAccessKey !== undefined ? body.s3.secretAccessKey : currentDoc.s3?.secretAccessKey || '').trim(),
      bucket: (body.s3?.bucket || currentDoc.s3?.bucket || DEFAULT_S3_CONFIG.bucket).trim(),
      publicUrl: (body.s3?.publicUrl || currentDoc.s3?.publicUrl || '').trim(),
      folder: (body.s3?.folder || currentDoc.s3?.folder || 'accounts').trim(),
    };
    if (!s3Config.publicUrl && s3Config.endpoint && s3Config.bucket) {
      s3Config.publicUrl = `${s3Config.endpoint.replace(/\/$/, '')}/${s3Config.bucket}`;
    }

    // 2. Validate SEO
    const seoTitle = body.seo?.title?.trim() || body.siteName?.trim() || currentDoc.seo?.title || DEFAULT_WEBSITE_SETTINGS.seo.title;
    const seoDescription = body.seo?.description?.trim() || body.siteDescription?.trim() || currentDoc.seo?.description || DEFAULT_WEBSITE_SETTINGS.seo.description;
    const rawKeywords = body.seo?.keywords;
    const seoKeywords = Array.isArray(rawKeywords)
      ? rawKeywords.map((k: string) => String(k).trim()).filter(Boolean)
      : typeof rawKeywords === 'string'
      ? rawKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
      : currentDoc.seo?.keywords || DEFAULT_WEBSITE_SETTINGS.seo.keywords;

    const ogImage = body.seo?.ogImage?.url
      ? {
          url: sanitizeUrl(body.seo.ogImage.url) || '',
          publicId: body.seo.ogImage.publicId?.trim() || '',
        }
      : currentDoc.seo?.ogImage;

    const canonicalUrl = sanitizeUrl(body.seo?.canonicalUrl || currentDoc.seo?.canonicalUrl || '') || '';

    // 3. Validate Branding (Logo & Favicon) - NO COLORS
    const logo = body.logo?.url
      ? {
          url: sanitizeUrl(body.logo.url) || '',
          publicId: body.logo.publicId?.trim() || '',
        }
      : body.logo === null
      ? undefined
      : currentDoc.logo;

    const favicon = body.favicon?.url
      ? {
          url: sanitizeUrl(body.favicon.url) || '',
          publicId: body.favicon.publicId?.trim() || '',
        }
      : body.favicon === null
      ? undefined
      : currentDoc.favicon;

    // 4. Validate Contact & Social
    const contact = {
      email: body.contact?.email?.trim() || body.supportEmail?.trim() || currentDoc.contact?.email || DEFAULT_WEBSITE_SETTINGS.contact.email,
      phone: body.contact?.phone?.trim() || body.hotline?.trim() || currentDoc.contact?.phone || DEFAULT_WEBSITE_SETTINGS.contact.phone,
      zalo: body.contact?.zalo?.trim() || currentDoc.contact?.zalo || DEFAULT_WEBSITE_SETTINGS.contact.zalo,
      address: body.contact?.address?.trim() || body.address?.trim() || currentDoc.contact?.address || DEFAULT_WEBSITE_SETTINGS.contact.address,
    };

    const social = {
      facebook: sanitizeUrl(body.social?.facebook || currentDoc.social?.facebook) || '',
      youtube: sanitizeUrl(body.social?.youtube || currentDoc.social?.youtube) || '',
      tiktok: sanitizeUrl(body.social?.tiktok || currentDoc.social?.tiktok) || '',
      telegram: sanitizeUrl(body.social?.telegram || currentDoc.social?.telegram) || '',
      zalo: sanitizeUrl(body.social?.zalo || currentDoc.social?.zalo) || '',
    };

    // 5. Validate Footer
    const footer = {
      description: body.footer?.description?.trim() || currentDoc.footer?.description || DEFAULT_WEBSITE_SETTINGS.footer.description,
      copyright: body.footer?.copyright?.trim() || currentDoc.footer?.copyright || DEFAULT_WEBSITE_SETTINGS.footer.copyright,
    };

    // 6. Validate Announcement
    const announcement = {
      enabled: body.announcement?.enabled !== undefined ? Boolean(body.announcement.enabled) : currentDoc.announcement?.enabled ?? true,
      text: body.announcement?.text?.trim() || currentDoc.announcement?.text || DEFAULT_WEBSITE_SETTINGS.announcement.text,
      link: sanitizeUrl(body.announcement?.link || currentDoc.announcement?.link) || '',
    };

    // 7. Validate Maintenance
    const maintenance = {
      enabled: body.maintenance?.enabled !== undefined ? Boolean(body.maintenance.enabled) : body.maintenanceMode !== undefined ? Boolean(body.maintenanceMode) : currentDoc.maintenance?.enabled ?? false,
      message: body.maintenance?.message?.trim() || currentDoc.maintenance?.message || DEFAULT_WEBSITE_SETTINGS.maintenance.message,
    };

    // 8. Payment & Bank Config
    const payment = {
      sepayApiKey: body.payment?.sepayApiKey !== undefined ? body.payment.sepayApiKey.trim() : currentDoc.payment?.sepayApiKey || '',
      sepayActive: body.payment?.sepayActive !== undefined ? Boolean(body.payment.sepayActive) : currentDoc.payment?.sepayActive ?? true,
      momoPartnerCode: body.payment?.momoPartnerCode !== undefined ? body.payment.momoPartnerCode.trim() : currentDoc.payment?.momoPartnerCode || '',
      momoActive: body.payment?.momoActive !== undefined ? Boolean(body.payment.momoActive) : currentDoc.payment?.momoActive ?? false,
      depositPrefix: (body.payment?.depositPrefix || currentDoc.payment?.depositPrefix || 'NAP').trim().toUpperCase(),
      buyPrefix: (body.payment?.buyPrefix || currentDoc.payment?.buyPrefix || 'BUY').trim().toUpperCase(),
      bankAccounts: Array.isArray(body.payment?.bankAccounts)
        ? body.payment.bankAccounts
        : currentDoc.payment?.bankAccounts || [],
    };

    // 9. Telegram Bot Config
    const telegram = {
      enabled: body.telegram?.enabled !== undefined ? Boolean(body.telegram.enabled) : Boolean(currentDoc.telegram?.enabled),
      botToken: body.telegram?.botToken !== undefined ? body.telegram.botToken.trim() : currentDoc.telegram?.botToken || '',
      chatId: body.telegram?.chatId !== undefined ? body.telegram.chatId.trim() : currentDoc.telegram?.chatId || '',
      notifyDeposit: body.telegram?.notifyDeposit !== undefined ? Boolean(body.telegram.notifyDeposit) : currentDoc.telegram?.notifyDeposit ?? true,
      notifyOrder: body.telegram?.notifyOrder !== undefined ? Boolean(body.telegram.notifyOrder) : currentDoc.telegram?.notifyOrder ?? true,
      notifyLowStock: body.telegram?.notifyLowStock !== undefined ? Boolean(body.telegram.notifyLowStock) : currentDoc.telegram?.notifyLowStock ?? true,
      lowStockThreshold: Number(body.telegram?.lowStockThreshold) > 0 ? Number(body.telegram.lowStockThreshold) : currentDoc.telegram?.lowStockThreshold || 3,
    };

    // 10. Google OAuth 2.0 Config
    const googleAuth = {
      enabled: body.googleAuth?.enabled !== undefined ? Boolean(body.googleAuth.enabled) : Boolean(currentDoc.googleAuth?.enabled),
      clientId: (body.googleAuth?.clientId !== undefined ? body.googleAuth.clientId : currentDoc.googleAuth?.clientId || '').trim(),
      clientSecret: (body.googleAuth?.clientSecret !== undefined ? body.googleAuth.clientSecret : currentDoc.googleAuth?.clientSecret || '').trim(),
    };

    // Unified Document
    const updatedDocument = {
      key: 'system_settings',
      siteName: body.siteName?.trim() || body.storeName?.trim() || currentDoc.siteName || DEFAULT_WEBSITE_SETTINGS.siteName,
      brandName: body.brandName?.trim() || currentDoc.brandName || DEFAULT_WEBSITE_SETTINGS.brandName,
      siteDescription: body.siteDescription?.trim() || body.storeSlogan?.trim() || currentDoc.siteDescription || DEFAULT_WEBSITE_SETTINGS.siteDescription,
      siteUrl: sanitizeUrl(body.siteUrl || currentDoc.siteUrl) || DEFAULT_WEBSITE_SETTINGS.siteUrl,
      logo,
      favicon,
      seo: {
        title: seoTitle,
        description: seoDescription,
        keywords: seoKeywords,
        ogImage,
        canonicalUrl,
      },
      contact,
      social,
      footer,
      announcement,
      maintenance,
      
      // Store operations
      defaultWarrantyDays: Number(body.defaultWarrantyDays) || currentDoc.defaultWarrantyDays || 7,
      autoDelivery: body.autoDelivery !== undefined ? Boolean(body.autoDelivery) : currentDoc.autoDelivery ?? true,
      minDepositAmount: Number(body.minDepositAmount) || currentDoc.minDepositAmount || 10000,
      
      // Legacy compatibility mirrors
      storeName: body.siteName?.trim() || body.storeName?.trim() || currentDoc.storeName || DEFAULT_WEBSITE_SETTINGS.siteName,
      storeSlogan: body.siteDescription?.trim() || body.storeSlogan?.trim() || currentDoc.storeSlogan || DEFAULT_WEBSITE_SETTINGS.siteDescription,
      hotline: contact.phone,
      supportEmail: contact.email,
      address: contact.address,
      maintenanceMode: maintenance.enabled,
      
      s3: s3Config,
      payment,
      telegram,
      googleAuth,
      updatedAt: new Date(),
    };

    await settingsCol.updateOne(
      { key: 'system_settings' },
      { $set: updatedDocument as any },
      { upsert: true }
    );

    invalidateWebsiteSettingsCache();

    return NextResponse.json({
      success: true,
      message: 'Đã lưu Cài đặt Website và Thiết lập hệ thống thành công!',
      settings: updatedDocument,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin Settings Update Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi lưu cấu hình: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

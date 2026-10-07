import { NextResponse } from 'next/server';
import { getWebsiteSettingsFromDb, extractPublicSettings } from '@/lib/db/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/settings - Lấy thông tin cấu hình website công khai cho Frontend
 */
export async function GET() {
  try {
    const fullSettings = await getWebsiteSettingsFromDb();
    const publicSettings = extractPublicSettings(fullSettings);

    return NextResponse.json({
      success: true,
      settings: publicSettings,
    });
  } catch (error) {
    console.error('[Public Settings API Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tải cấu hình website.' },
      { status: 500 }
    );
  }
}

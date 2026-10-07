import { NextResponse } from 'next/server';
import { getSettingsCollection } from '@/lib/db/collections';
import { PublicBankInfo, PublicPaymentSettings } from '@/types/bank';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settingsCol = await getSettingsCollection();
    const doc = await settingsCol.findOne({ key: 'system_settings' });

    const rawBanks = Array.isArray(doc?.payment?.bankAccounts) ? doc!.payment!.bankAccounts : [];

    // Filter only active banks
    const activeBanks: PublicBankInfo[] = rawBanks
      .filter((b) => b.active !== false)
      .map((b) => ({
        id: b.id || b.bankCode,
        bankCode: b.bankCode,
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        accountHolder: b.accountHolder,
        branch: b.branch,
        isDefault: Boolean(b.isDefault),
        qrUrlTemplate: `https://img.vietqr.io/image/${b.bankCode}-${b.accountNumber}-compact2.png`,
      }));

    // Fallback if none active
    if (activeBanks.length === 0) {
      activeBanks.push({
        id: 'bank-mbbank',
        bankCode: 'MBBank',
        bankName: 'Ngân hàng Quân Đội (MBBank)',
        accountNumber: '0987654321',
        accountHolder: 'GAMESTORE VIETNAM',
        branch: 'Hà Nội',
        isDefault: true,
        qrUrlTemplate: 'https://img.vietqr.io/image/MBBank-0987654321-compact2.png',
      });
    }

    const payload: PublicPaymentSettings = {
      sepayActive: doc?.payment?.sepayActive ?? true,
      depositPrefix: doc?.payment?.depositPrefix || 'NAP',
      minDepositAmount: doc?.minDepositAmount || 10000,
      banks: activeBanks,
      hotline: doc?.hotline || '1900 8888',
      supportEmail: doc?.supportEmail || 'hotro@gamestore.vn',
    };

    return NextResponse.json(
      {
        success: true,
        data: payload,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('[Public Payment Banks GET Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải danh sách ngân hàng: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

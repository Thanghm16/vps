import { NextResponse } from 'next/server';
import { getAccountsCollection } from '@/lib/db/collections';
import { serializePublicAccount } from '@/types/db-account';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const decodedCode = decodeURIComponent(code);

    const accounts = await getAccountsCollection();

    // Tìm kiếm theo code hoặc slug
    const account = await accounts.findOne({
      $or: [{ code: decodedCode }, { slug: decodedCode }],
      status: { $ne: 'hidden' },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy tài khoản game.' },
        { status: 404 }
      );
    }

    // Tăng lượt xem tự động
    await accounts.updateOne({ _id: account._id }, { $inc: { views: 1 } });

    // Trả về dữ liệu công khai an toàn (không có credentials)
    return NextResponse.json({
      success: true,
      account: serializePublicAccount({ ...account, views: (account.views || 0) + 1 }),
    });
  } catch (error) {
    console.error('[API GET Account Detail Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi tải chi tiết tài khoản.' },
      { status: 500 }
    );
  }
}

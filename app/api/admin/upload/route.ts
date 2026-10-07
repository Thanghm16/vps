import { NextResponse } from 'next/server';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { uploadToCloudfly } from '@/lib/s3/cloudfly';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng chọn file ảnh để tải lên.' },
        { status: 400 }
      );
    }

    // Kiểm tra định dạng file ảnh
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Định dạng file không hỗ trợ. Vui lòng chọn JPG, PNG, WEBP.' },
        { status: 400 }
      );
    }

    // Giới hạn dung lượng tối đa 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Kích thước ảnh tối đa là 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder = (formData.get('folder') as string) || 'banners';

    const result = await uploadToCloudfly(
      buffer,
      file.name,
      file.type,
      folder
    );

    return NextResponse.json({
      success: true,
      message: 'Tải ảnh lên Cloudfly S3 thành công!',
      url: result.url,
      key: result.key,
      size: result.size,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Cloudfly Upload Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải ảnh lên S3 Cloudfly: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

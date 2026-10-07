import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    await requireAdmin();

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID bài viết không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const result = await newsColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'draft', updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài viết.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Chuyển bài viết về Bản nháp thành công!',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Unpublish Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi gỡ xuất bản bài viết.' }, { status: 500 });
  }
}

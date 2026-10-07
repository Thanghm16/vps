import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { getNewsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF validation failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = await request.json();
    const action = String(body.action || '').trim();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (!ids.length) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn ít nhất 1 bài viết để thao tác.' }, { status: 400 });
    }

    const validObjectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (!validObjectIds.length) {
      return NextResponse.json({ success: false, message: 'Danh sách ID không hợp lệ.' }, { status: 400 });
    }

    const newsColl = await getNewsCollection();
    const now = new Date();

    if (action === 'delete') {
      const result = await newsColl.deleteMany({ _id: { $in: validObjectIds } });
      return NextResponse.json({
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} bài viết!`,
      });
    }

    if (action === 'publish') {
      const result = await newsColl.updateMany(
        { _id: { $in: validObjectIds } },
        {
          $set: {
            status: 'published',
            updatedAt: now,
          },
          $setOnInsert: {
            publishedAt: now,
          },
        }
      );
      // Đảm bảo những bài chưa có publishedAt được gán thời gian hiện tại
      await newsColl.updateMany(
        { _id: { $in: validObjectIds }, publishedAt: null },
        { $set: { publishedAt: now } }
      );

      return NextResponse.json({
        success: true,
        message: `Đã xuất bản thành công ${result.modifiedCount} bài viết!`,
      });
    }

    if (action === 'unpublish') {
      const result = await newsColl.updateMany(
        { _id: { $in: validObjectIds } },
        { $set: { status: 'draft', updatedAt: now } }
      );
      return NextResponse.json({
        success: true,
        message: `Đã chuyển ${result.modifiedCount} bài viết về Bản nháp!`,
      });
    }

    if (action === 'archive') {
      const result = await newsColl.updateMany(
        { _id: { $in: validObjectIds } },
        { $set: { status: 'archived', updatedAt: now } }
      );
      return NextResponse.json({
        success: true,
        message: `Đã lưu trữ thành công ${result.modifiedCount} bài viết!`,
      });
    }

    return NextResponse.json({ success: false, message: 'Hành động hàng loạt không hợp lệ.' }, { status: 400 });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[Admin News Bulk Action Error]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi thực thi thao tác hàng loạt.' }, { status: 500 });
  }
}

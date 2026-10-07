import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser, verifyCsrfOrigin } from '@/lib/auth/server';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { executeSpin } from '@/lib/lucky-wheel/spin-engine';
import { getLuckyWheelsCollection } from '@/lib/db/collections';

export const runtime = 'nodejs';

/**
 * POST /api/lucky-wheel/[id]/spin
 * Endpoint thực hiện lượt quay may mắn hoàn toàn từ server-side
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Kiểm tra CSRF
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, message: 'Kiểm tra bảo mật CSRF thất bại.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Mã vòng quay không hợp lệ.' },
        { status: 400 }
      );
    }

    // 2. Tìm vòng quay trong DB
    const wheelsCol = await getLuckyWheelsCollection();
    let wheel = null;
    if (ObjectId.isValid(id)) {
      wheel = await wheelsCol.findOne({ _id: new ObjectId(id) });
    }
    if (!wheel) {
      wheel = await wheelsCol.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!wheel || !wheel._id) {
      return NextResponse.json(
        { success: false, message: 'Vòng quay may mắn không tồn tại.' },
        { status: 404 }
      );
    }

    // 3. Xác thực người dùng (nếu vòng quay yêu cầu login)
    const user = await getCurrentUser();
    if (wheel.requireLogin && !user) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để tham gia vòng quay may mắn.' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Cần tài khoản người dùng để ghi nhận phần thưởng.' },
        { status: 401 }
      );
    }

    // 4. Rate Limiting: Chống spam request spin (Tối đa 5 lượt quay / 10s cho mỗi user)
    const clientIp = getClientIp(request);
    const rateLimitKey = `spin:${user.id}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 5, 10);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Thao tác quá nhanh! Vui lòng chờ ${rateLimit.resetInSeconds} giây trước khi quay tiếp.`,
        },
        { status: 429 }
      );
    }

    // 5. Đọc Idempotency-Key từ request headers hoặc body
    let idempotencyKey: string | undefined;
    try {
      const body = await request.json();
      idempotencyKey = body?.idempotencyKey || request.headers.get('x-idempotency-key') || undefined;
    } catch {
      idempotencyKey = request.headers.get('x-idempotency-key') || undefined;
    }

    // 6. Thực thi lượt quay qua server spin engine (Weighted Random, Atomic, Reward Fulfillment)
    const spinResult = await executeSpin({
      wheelId: wheel._id,
      user,
      idempotencyKey,
      ip: clientIp,
    });

    if (!spinResult.success) {
      return NextResponse.json(
        { success: false, message: spinResult.message },
        { status: 400 }
      );
    }

    return NextResponse.json(spinResult);
  } catch (error) {
    console.error('[API /api/lucky-wheel/[id]/spin POST Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi thực hiện lượt quay: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

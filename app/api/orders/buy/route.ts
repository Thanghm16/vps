import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/auth/server';
import {
  getAccountsCollection,
  getUsersCollection,
  getOrdersCollection,
  getTransactionsCollection,
  getCouponsCollection,
  getGamesCollection,
} from '@/lib/db/collections';
import { decryptCredentials } from '@/lib/crypto/encryption';
import { validateCouponServerSide } from '@/lib/coupons/validate';
import { OrderDocument } from '@/types/db-order';
import { TransactionDocument } from '@/types/db-transaction';
import { notifyNewOrder, checkAndNotifyLowStock } from '@/lib/telegram/bot';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 1. Xác thực người dùng
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để thực hiện mua tài khoản.' },
        { status: 401 }
      );
    }

    // 2. Đọc payload
    const body = await request.json();
    const { accountCode, paymentMethod = 'wallet', couponCode } = body || {};

    if (!accountCode || typeof accountCode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Mã tài khoản game không hợp lệ.' },
        { status: 400 }
      );
    }

    const cleanCode = accountCode.trim().toUpperCase();
    const formattedCode = cleanCode.startsWith('#') ? cleanCode : `#${cleanCode}`;

    // 3. Tìm tài khoản game trong Database
    const accountsCol = await getAccountsCollection();
    const account = await accountsCol.findOne({
      $or: [{ code: formattedCode }, { code: cleanCode }],
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy tài khoản game trong hệ thống.' },
        { status: 404 }
      );
    }

    if (account.status !== 'available') {
      return NextResponse.json(
        { success: false, message: 'Tài khoản game này đã được bán hoặc tạm khóa.' },
        { status: 400 }
      );
    }

    const usersCol = await getUsersCollection();
    const ordersCol = await getOrdersCollection();
    const txCol = await getTransactionsCollection();
    const couponsCol = await getCouponsCollection();

    // 4. Kiểm tra & Tính toán mã giảm giá phía Server (nếu có)
    let finalPrice = account.price;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const couponValidation = await validateCouponServerSide({
        code: couponCode.trim().toUpperCase(),
        orderAmount: account.price,
        account,
        userId: user.id,
      });

      if (!couponValidation.valid || !couponValidation.coupon) {
        return NextResponse.json(
          {
            success: false,
            message: couponValidation.message || 'Mã giảm giá không hợp lệ.',
          },
          { status: 400 }
        );
      }

      appliedCoupon = couponValidation.coupon;
      discountAmount = couponValidation.discountAmount;
      finalPrice = couponValidation.finalTotal;
    }

    // 5. Xử lý thanh toán qua Ví Số Dư
    if (paymentMethod === 'wallet') {
      const freshUser = await usersCol.findOne({ _id: new ObjectId(user.id) });
      if (!freshUser) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy thông tin tài khoản người dùng.' },
          { status: 404 }
        );
      }

      const userBalance = freshUser.balance || 0;
      if (userBalance < finalPrice) {
        return NextResponse.json(
          {
            success: false,
            message: `Số dư ví không đủ để thanh toán. Bạn còn thiếu ${(finalPrice - userBalance).toLocaleString('vi-VN')} ₫.`,
            requiredAmount: finalPrice,
            currentBalance: userBalance,
            shortfall: finalPrice - userBalance,
          },
          { status: 400 }
        );
      }

      // 5. ATOMIC CLAIM: Đảm bảo chỉ 1 request duy nhất claim thành công nick game
      const now = new Date();
      const claimedAccount = await accountsCol.findOneAndUpdate(
        { _id: account._id, status: 'available' },
        {
          $set: {
            status: 'sold',
            buyerId: freshUser._id,
            buyerUsername: freshUser.username,
            soldAt: now,
            updatedAt: now,
          },
        },
        { returnDocument: 'after' }
      );

      if (!claimedAccount) {
        return NextResponse.json(
          {
            success: false,
            message: 'Tài khoản game này vừa được người khác mua hoặc không còn khả dụng.',
          },
          { status: 409 }
        );
      }

      // 6. ATOMIC DEDUCTION: Trừ số dư ví người dùng với điều kiện balance >= finalPrice
      const deductResult = await usersCol.updateOne(
        { _id: freshUser._id, balance: { $gte: finalPrice } },
        {
          $inc: { balance: -finalPrice },
          $set: { updatedAt: now },
        }
      );

      // ROLLBACK nếu trừ tiền thất bại (ví dụ số dư bị thay đổi song song)
      if (deductResult.modifiedCount === 0) {
        await accountsCol.updateOne(
          { _id: account._id, status: 'sold', buyerId: freshUser._id },
          {
            $set: { status: 'available', updatedAt: new Date() },
            $unset: { buyerId: '', buyerUsername: '', soldAt: '' },
          }
        );

        return NextResponse.json(
          { success: false, message: 'Số dư ví không đủ hoặc xảy ra xung đột khi trừ tiền.' },
          { status: 400 }
        );
      }

      // 7. Cập nhật lượt sử dụng mã giảm giá (Atomic increment)
      if (appliedCoupon && appliedCoupon._id) {
        await couponsCol.updateOne(
          { _id: appliedCoupon._id },
          {
            $inc: { usedCount: 1 },
            $set: { updatedAt: now },
          }
        );
      }

      // 8. Giải mã thông tin đăng nhập tài khoản
      const decryptedCreds = decryptCredentials(account.credentials);

      // 9. Tạo mã đơn hàng & Lưu OrderDocument
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const orderCode = `DH-${timestamp}-${randomSuffix}`;

      const deliveryCredentials = {
        username: decryptedCreds?.loginUsername || account.credentials?.loginUsername || '',
        password: decryptedCreds?.loginPassword || account.credentials?.loginPassword || '',
        twoFactorCode: decryptedCreds?.twoFactorCode || account.credentials?.twoFactorCode || '',
        emailBound: decryptedCreds?.emailBound || account.credentials?.emailBound || '',
        phoneBound: decryptedCreds?.phoneBound || account.credentials?.phoneBound || '',
        note: decryptedCreds?.note || account.credentials?.note || '',
      };

      const newOrder: OrderDocument = {
        code: orderCode,
        accountId: account._id,
        accountCode: account.code,
        accountTitle: account.title,
        accountThumbnail: account.thumbnail || account.images?.[0] || '',
        gameSlug: account.gameSlug || '',
        gameName: account.gameName || '',
        amount: finalPrice,
        subtotal: account.price,
        discountAmount,
        couponCode: appliedCoupon?.code,
        couponId: appliedCoupon?._id,
        paymentMethod: 'wallet',
        status: 'delivered',
        customerName: freshUser.username,
        customerEmail: freshUser.email,
        userId: freshUser._id,
        username: freshUser.username,
        deliveryCredentials,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await ordersCol.insertOne(newOrder);

      // 10. Tạo bản ghi giao dịch ví TransactionDocument
      const txDoc: TransactionDocument = {
        code: `TX-BUY-${timestamp}`,
        orderCode: orderCode,
        amount: finalPrice,
        status: 'success',
        gateway: 'Wallet',
        transferType: 'out',
        transactionDate: new Date().toISOString(),
        content: appliedCoupon
          ? `Mua nick ${account.code} (${account.gameName}) - Mã ${appliedCoupon.code}`
          : `Mua nick ${account.code} (${account.gameName})`,
        customerName: freshUser.username,
        accountNumber: String(freshUser.userCode || freshUser.username),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await txCol.insertOne(txDoc);

      // Cập nhật số lượng nick khả dụng của game
      try {
        const gamesCol = await getGamesCollection();
        if (account.gameSlug) {
          await gamesCol.updateOne(
            { slug: account.gameSlug },
            { $inc: { accountsCount: -1 } }
          );
        }
      } catch (countErr) {
        console.warn('[Game Count Decrement Warning]:', countErr);
      }

      const updatedBalance = userBalance - finalPrice;

      // Gửi thông báo Telegram Bot cho Admin (Asynchronous non-blocking)
      notifyNewOrder({
        orderCode: orderCode,
        accountCode: account.code,
        gameName: account.gameName || account.gameSlug || 'Nick Game',
        amount: finalPrice,
        subtotal: account.price,
        discountAmount: discountAmount,
        couponCode: appliedCoupon?.code,
        customerName: freshUser.username,
        paymentMethod: 'wallet',
        date: new Date(),
      }).catch((err) => console.error('[Telegram Buy Notify Error]:', err));

      if (account.gameSlug) {
        checkAndNotifyLowStock(account.gameSlug, account.gameName).catch((err) =>
          console.error('[Telegram Low Stock Alert Error]:', err)
        );
      }

      return NextResponse.json({
        success: true,
        message: appliedCoupon
          ? `🎉 Mua tài khoản thành công! Đã áp dụng mã ${appliedCoupon.code} (giảm ${discountAmount.toLocaleString('vi-VN')} ₫).`
          : '🎉 Mua tài khoản thành công! Thông tin đăng nhập đã được bàn giao.',
        order: newOrder,
        credentials: deliveryCredentials,
        newBalance: updatedBalance,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Phương thức thanh toán chưa được hỗ trợ trực tiếp.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API Order Buy Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi hệ thống khi xử lý đơn hàng.' },
      { status: 500 }
    );
  }
}

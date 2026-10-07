import { NextResponse } from 'next/server';
import {
  getTransactionsCollection,
  getOrdersCollection,
  getAccountsCollection,
  getUsersCollection,
  getGamesCollection,
} from '@/lib/db/collections';
import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import { SePayWebhookPayload, TransactionDocument } from '@/types/db-transaction';
import { OrderDocument } from '@/types/db-order';
import { decryptCredentials } from '@/lib/crypto/encryption';
import {
  notifyDepositSuccess,
  notifyNewOrder,
  checkAndNotifyLowStock,
} from '@/lib/telegram/bot';

export const runtime = 'nodejs';

/**
 * Trích xuất mã giao dịch / mã nick / mã nạp tiền từ nội dung chuyển khoản
 */
function extractPaymentInfo(content: string, code?: string | null): {
  paymentCode?: string;
  accountCode?: string;
  orderCode?: string;
  depositUserCode?: number;
  depositUsername?: string;
} {
  const result: {
    paymentCode?: string;
    accountCode?: string;
    orderCode?: string;
    depositUserCode?: number;
    depositUsername?: string;
  } = {};

  if (code && typeof code === 'string' && code.trim()) {
    result.paymentCode = code.trim().toUpperCase();
  }

  const raw = `${code || ''} ${content || ''}`.toUpperCase();

  // 1. Nhận diện mã nick game: #LQ-10001, LQ10001, VAL-10001, FF-10001, FCO-10001, LMHT-10001, GEN-10001, RBLX-10001, PUBG-10001, TC-10001, HSR-10001
  const accountMatch = raw.match(/#?(LQ|VAL|FF|FCO|LMHT|GEN|RBLX|PUBG|TC|HSR)[-_]?\d{4,6}/i);
  if (accountMatch) {
    const rawMatch = accountMatch[0].replace(/[^a-zA-Z0-9]/g, '');
    const prefix = rawMatch.replace(/\d+$/, '');
    const num = rawMatch.replace(/^[a-zA-Z]+/, '');
    result.accountCode = `#${prefix}-${num}`;
  }

  // 2. Nhận diện mã đơn hàng: #ORD-10291, ORD10291, DH10291
  const orderMatch = raw.match(/#?(ORD|DH)[-_]?[A-Z0-9]{4,12}/i);
  if (orderMatch) {
    result.orderCode = orderMatch[0].toUpperCase();
  }

  // 3. Nhận diện cú pháp nạp tiền theo Mã Khách Hàng (UserCode dạng số): NAP 10028, NAP10028, NAP U10028, NAP_10028
  const codeMatch = raw.match(/NAP[_ ]?U?([0-9]{4,8})(?:[^0-9]|$)/i);
  if (codeMatch && codeMatch[1]) {
    result.depositUserCode = parseInt(codeMatch[1], 10);
  }

  // 4. Nhận diện cú pháp nạp tiền dự phòng theo Username: NAP USERNAME
  if (!result.depositUserCode) {
    const depositMatch = raw.match(/NAP[_ ]?([a-zA-Z0-9_]{3,20})/i);
    if (depositMatch && depositMatch[1]) {
      result.depositUsername = depositMatch[1].toLowerCase();
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    // 1. XÁC THỰC WEBHOOK (FAIL CLOSED)
    // Phải cấu hình API Key trong ENV hoặc MongoDB system_settings
    let expectedApiKey = process.env.SEPAY_API_KEY?.trim();
    if (!expectedApiKey) {
      const dbSettings = await getWebsiteSettingsFromDb();
      expectedApiKey = dbSettings.payment?.sepayApiKey?.trim();
    }

    // FAIL CLOSED: Không có secret cấu hình -> Từ chối tuyệt đối
    if (!expectedApiKey) {
      console.error('[SePay Webhook] Access Denied: SePay API Key is not configured on server (Fail Closed).');
      return NextResponse.json(
        { success: false, message: 'Webhook authentication is not configured.' },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();

    if (token !== expectedApiKey && authHeader.trim() !== expectedApiKey) {
      console.warn('[SePay Webhook] Access Denied: Invalid Authorization token/header provided.');
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid SePay API Key.' },
        { status: 401 }
      );
    }

    // 2. Đọc & Validate payload từ SePay
    let payload: SePayWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!payload || payload.id === undefined || payload.id === null) {
      return NextResponse.json({ success: false, message: 'Missing transaction ID in payload' }, { status: 400 });
    }

    const transferAmount = Number(payload.transferAmount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid transferAmount: must be a positive number' }, { status: 400 });
    }

    // 3. Chỉ xử lý các giao dịch tiền vào (transferType: 'in')
    if (payload.transferType !== 'in') {
      console.log(`[SePay Webhook] Ignored non-deposit transferType '${payload.transferType}' (id: ${payload.id})`);
      return NextResponse.json({ success: true, message: 'Ignored non-incoming transfer' }, { status: 200 });
    }

    const transactionsCollection = await getTransactionsCollection();
    const ordersCollection = await getOrdersCollection();
    const accountsCollection = await getAccountsCollection();
    const usersCollection = await getUsersCollection();

    // 4. CHỐNG TRÙNG LẶP GIAO DỊCH (Idempotency Check)
    // SePay ID là duy nhất trên hệ thống SePay qua mọi lần retry và replay
    const existingTxn = await transactionsCollection.findOne({ sepayId: payload.id });
    if (existingTxn) {
      console.log(`[SePay Webhook] Transaction ${payload.id} was already processed. Returning 200 immediately.`);
      return NextResponse.json({ success: true, message: 'Transaction already processed' }, { status: 200 });
    }

    // 5. Trích xuất thông tin mã thanh toán, mã nick, mã đơn hoặc tên tài khoản nạp tiền
    const parsed = extractPaymentInfo(payload.content, payload.code);
    const txnCode = `TXN-${Date.now()}-${payload.id}`;

    let matchedType: 'order' | 'deposit' | 'unmatched' = 'unmatched';
    let matchedOrderCode: string | undefined = undefined;
    let matchedAccountCode: string | undefined = undefined;
    let matchedUsername: string | undefined = undefined;
    let matchedCustomerName: string = payload.description || 'Khách hàng VietQR';

    // 6. Xử lý kịch bản A: Khách thanh toán mua Nick Game trực tiếp
    if (parsed.accountCode) {
      const searchCodes = [parsed.accountCode, parsed.accountCode.replace('#', ''), `#${parsed.accountCode.replace('#', '')}`];
      
      // ATOMIC CLAIM: Đảm bảo nick game chỉ bán cho 1 transaction duy nhất có số tiền >= giá niêm yết
      const now = new Date();
      const claimedAccount = await accountsCollection.findOneAndUpdate(
        {
          code: { $in: searchCodes },
          status: 'available',
          price: { $lte: transferAmount },
        },
        {
          $set: {
            status: 'sold',
            soldAt: now,
            updatedAt: now,
          },
        },
        { returnDocument: 'after' }
      );

      if (claimedAccount) {
        // Giải mã thông tin đăng nhập để bàn giao tự động
        const decryptedCredentials = decryptCredentials(claimedAccount.credentials);

        // Tạo đơn hàng thành công
        const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const orderDoc: OrderDocument = {
          code: orderCode,
          accountId: claimedAccount._id,
          accountCode: claimedAccount.code,
          accountTitle: claimedAccount.title,
          accountThumbnail: claimedAccount.thumbnail,
          gameSlug: claimedAccount.gameSlug,
          gameName: claimedAccount.gameName,
          amount: transferAmount,
          paymentMethod: 'vietqr',
          status: 'delivered',
          customerName: matchedCustomerName,
          sepayTransactionId: payload.id,
          deliveryCredentials: decryptedCredentials,
          createdAt: now,
          updatedAt: now,
        };

        await ordersCollection.insertOne(orderDoc);

        matchedType = 'order';
        matchedOrderCode = orderCode;
        matchedAccountCode = claimedAccount.code;
        console.log(`[SePay Webhook] ✅ Auto-delivered Account ${claimedAccount.code} via Order ${orderCode}`);

        // Cập nhật số lượng nick khả dụng của game
        if (claimedAccount.gameSlug) {
          try {
            const gamesCol = await getGamesCollection();
            await gamesCol.updateOne(
              { slug: claimedAccount.gameSlug },
              { $inc: { accountsCount: -1 } }
            );
          } catch (countErr) {
            console.warn('[Game Count Decrement Warning]:', countErr);
          }
        }

        // Gửi thông báo Telegram Bot cho Admin (Asynchronous non-blocking)
        notifyNewOrder({
          orderCode,
          accountCode: claimedAccount.code,
          gameName: claimedAccount.gameName || claimedAccount.gameSlug || 'Nick Game',
          amount: transferAmount,
          customerName: matchedCustomerName,
          paymentMethod: 'vietqr',
          date: now,
        }).catch((err) => console.error('[Telegram Order Notify Error]:', err));

        if (claimedAccount.gameSlug) {
          checkAndNotifyLowStock(claimedAccount.gameSlug, claimedAccount.gameName).catch((err) =>
            console.error('[Telegram Low Stock Alert Error]:', err)
          );
        }
      }
    }

    // 7. Xử lý kịch bản B: Khách nạp tiền vào ví tài khoản (Cú pháp NAP [userCode] hoặc NAP [username])
    if (matchedType === 'unmatched') {
      let targetUser = null;
      if (parsed.depositUserCode) {
        targetUser = await usersCollection.findOne({ userCode: parsed.depositUserCode });
      }
      if (!targetUser && parsed.depositUsername) {
        targetUser = await usersCollection.findOne({ username: parsed.depositUsername.toLowerCase() });
      }

      if (targetUser) {
        const now = new Date();
        await usersCollection.updateOne(
          { _id: targetUser._id },
          {
            $inc: { balance: transferAmount },
            $set: { updatedAt: now },
          }
        );

        matchedType = 'deposit';
        matchedUsername = targetUser.username;
        matchedCustomerName = targetUser.username;
        console.log(`[SePay Webhook] ✅ Credited ${transferAmount} VND to user ${targetUser.username} (UserCode: ${targetUser.userCode})`);

        // Gửi thông báo Telegram Bot nạp tiền cho Admin (Asynchronous non-blocking)
        notifyDepositSuccess({
          username: targetUser.username,
          userCode: targetUser.userCode,
          amount: transferAmount,
          transactionCode: txnCode,
          gateway: payload.gateway || 'VietQR / SePay',
          content: payload.content,
          date: now,
        }).catch((err) => console.error('[Telegram Deposit Notify Error]:', err));
      }
    }

    // 8. Lưu nhật ký giao dịch an toàn (với sepayId duy nhất chống trùng lặp)
    const transactionDoc: TransactionDocument = {
      code: txnCode,
      sepayId: payload.id,
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      subAccount: payload.subAccount,
      paymentCode: payload.code || parsed.paymentCode,
      content: payload.content,
      transferType: payload.transferType,
      amount: transferAmount,
      accumulated: payload.accumulated,
      referenceCode: payload.referenceCode,
      transactionDate: payload.transactionDate,
      status: 'success',
      matchedType,
      orderCode: matchedOrderCode,
      accountCode: matchedAccountCode,
      username: matchedUsername,
      customerName: matchedCustomerName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await transactionsCollection.insertOne(transactionDoc);
    } catch (dbErr) {
      // Trường hợp 2 webhook đến đồng thời cùng sepayId, MongoDB unique index sẽ ném lỗi 11000
      if ((dbErr as { code?: number }).code === 11000) {
        console.log(`[SePay Webhook] Race condition prevented by unique sepayId index for id ${payload.id}`);
      } else {
        console.error('[SePay Webhook] Transaction save error:', dbErr);
      }
    }

    // 9. Trả về HTTP 200 kèm đúng body {"success": true} trong vòng 30s theo chuẩn SePay
    return NextResponse.json({ success: true, message: 'Processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('[SePay Webhook Error]:', error);
    return NextResponse.json({ success: false, message: 'Internal server error processing webhook' }, { status: 500 });
  }
}

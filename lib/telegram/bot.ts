import { getWebsiteSettingsFromDb } from '@/lib/db/settings';
import { getAccountsCollection } from '@/lib/db/collections';

interface TelegramSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Gửi tin nhắn đến Telegram Bot qua API chính thức
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  if (!botToken || !chatId || !text) {
    return {
      success: false,
      error: 'Thiếu Bot Token, Chat ID hoặc nội dung tin nhắn.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, message: 'Đã gửi thông báo Telegram thành công!' };
    }

    console.error('[Telegram Bot Error response]:', data);
    return {
      success: false,
      error: data.description || 'Lỗi gửi tin nhắn từ Telegram API.',
    };
  } catch (error) {
    console.error('[Telegram Bot Exception]:', error);
    return {
      success: false,
      error: (error as Error).message || 'Không thể kết nối tới Telegram API.',
    };
  }
}

/**
 * Định dạng thời gian theo giờ Việt Nam
 */
function formatVNTime(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * 1. THÔNG BÁO NẠP TIỀN THÀNH CÔNG (Deposit Success)
 */
export async function notifyDepositSuccess(depositInfo: {
  username?: string;
  userCode?: number | string;
  amount: number;
  transactionCode?: string;
  gateway?: string;
  content?: string;
  date?: Date;
}): Promise<void> {
  try {
    const settings = await getWebsiteSettingsFromDb();
    const config = settings.telegram;

    if (!config || !config.enabled || !config.notifyDeposit || !config.botToken || !config.chatId) {
      return;
    }

    const siteName = settings.siteName || settings.brandName || 'GameStore VN';
    const timeStr = formatVNTime(depositInfo.date || new Date());
    const amountStr = depositInfo.amount.toLocaleString('vi-VN');
    const userDisplay = depositInfo.username
      ? `<b>${depositInfo.username}</b>${depositInfo.userCode ? ` (Mã: #${depositInfo.userCode})` : ''}`
      : depositInfo.userCode
      ? `Mã khách: <b>#${depositInfo.userCode}</b>`
      : 'Khách hàng vãng lai';

    const message = [
      `💰 <b>NẠP TIỀN VÍ THÀNH CÔNG</b> 💰`,
      `━━━━━━━━━━━━━━━━━━`,
      `🏪 <b>Website:</b> <b>${siteName}</b>`,
      `👤 <b>Khách hàng:</b> ${userDisplay}`,
      `💵 <b>Số tiền nạp:</b> <b>+${amountStr} ₫</b>`,
      `🏦 <b>Cổng thanh toán:</b> ${depositInfo.gateway || 'SePay / VietQR'}`,
      depositInfo.transactionCode ? `🔖 <b>Mã giao dịch:</b> <code>${depositInfo.transactionCode}</code>` : '',
      depositInfo.content ? `📝 <b>Nội dung CK:</b> <i>${depositInfo.content}</i>` : '',
      `⏰ <b>Thời gian:</b> ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━`,
      `⚡️ <i>Hệ thống đã tự động cộng số dư vào ví khách hàng!</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(config.botToken, config.chatId, message);
  } catch (err) {
    console.error('[Telegram] Failed to notify deposit:', err);
  }
}

/**
 * 2. THÔNG BÁO ĐƠN MUA NICK MỚI (New Order)
 */
export async function notifyNewOrder(orderInfo: {
  orderCode: string;
  accountCode: string;
  gameName: string;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string;
  customerName?: string;
  paymentMethod?: string;
  date?: Date;
}): Promise<void> {
  try {
    const settings = await getWebsiteSettingsFromDb();
    const config = settings.telegram;

    if (!config || !config.enabled || !config.notifyOrder || !config.botToken || !config.chatId) {
      return;
    }

    const siteName = settings.siteName || settings.brandName || 'GameStore VN';
    const timeStr = formatVNTime(orderInfo.date || new Date());
    const amountStr = orderInfo.amount.toLocaleString('vi-VN');
    const paymentDisplay =
      orderInfo.paymentMethod === 'wallet' ? '💳 Ví Số Dư' : '🏦 VietQR / SePay';

    const couponInfo =
      orderInfo.couponCode && (orderInfo.discountAmount || 0) > 0
        ? `🎟 <b>Mã giảm giá:</b> <code>${orderInfo.couponCode}</code> (-${orderInfo.discountAmount?.toLocaleString('vi-VN')} ₫)\n`
        : '';

    const message = [
      `🛒 <b>ĐƠN MUA NICK MỚI</b> 🛒`,
      `━━━━━━━━━━━━━━━━━━`,
      `🏪 <b>Website:</b> <b>${siteName}</b>`,
      `📦 <b>Mã đơn hàng:</b> <code>${orderInfo.orderCode}</code>`,
      `🎮 <b>Tựa game:</b> <b>${orderInfo.gameName}</b>`,
      `🏷 <b>Mã Nick:</b> <code>${orderInfo.accountCode}</code>`,
      `👤 <b>Người mua:</b> <b>${orderInfo.customerName || 'Khách hàng'}</b>`,
      `💰 <b>Thanh toán:</b> <b>${amountStr} ₫</b>`,
      couponInfo ? couponInfo.trim() : '',
      `💳 <b>Phương thức:</b> ${paymentDisplay}`,
      `⏰ <b>Thời gian:</b> ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━`,
      `✨ <i>Tài khoản đã được bàn giao tự động tới khách hàng!</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(config.botToken, config.chatId, message);
  } catch (err) {
    console.error('[Telegram] Failed to notify order:', err);
  }
}

/**
 * 3. CẢNH BÁO KHO NICK SẮP HẾT (Low Stock Alert)
 */
export async function checkAndNotifyLowStock(
  gameSlug: string,
  gameName?: string
): Promise<void> {
  try {
    const settings = await getWebsiteSettingsFromDb();
    const config = settings.telegram;

    if (!config || !config.enabled || !config.notifyLowStock || !config.botToken || !config.chatId) {
      return;
    }

    const threshold = config.lowStockThreshold > 0 ? config.lowStockThreshold : 3;
    const accountsCol = await getAccountsCollection();
    const remainingCount = await accountsCol.countDocuments({
      gameSlug: gameSlug,
      status: 'available',
    });

    if (remainingCount <= threshold) {
      const siteName = settings.siteName || settings.brandName || 'GameStore VN';
      const timeStr = formatVNTime(new Date());
      const displayName = gameName || gameSlug.toUpperCase();

      const message = [
        `⚠️ <b>CẢNH BÁO KHO NICK SẮP HẾT!</b> ⚠️`,
        `━━━━━━━━━━━━━━━━━━`,
        `🏪 <b>Website:</b> <b>${siteName}</b>`,
        `🎮 <b>Tựa game:</b> <b>${displayName}</b>`,
        `📦 <b>Số nick còn lại:</b> 🚨 <b>${remainingCount} nick</b> (Ngưỡng cảnh báo: ≤ ${threshold})`,
        `⏰ <b>Thời gian:</b> ${timeStr}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🔔 <i>Admin vui lòng nhập thêm tài khoản vào kho để duy trì kinh doanh!</i>`,
      ].join('\n');

      await sendTelegramMessage(config.botToken, config.chatId, message);
    }
  } catch (err) {
    console.error('[Telegram] Failed to check and notify low stock:', err);
  }
}

/**
 * 4. KIỂM TRA KẾT NỐI TELEGRAM BOT (Test Notification)
 */
export async function sendTestTelegramNotification(
  customBotToken?: string,
  customChatId?: string,
  customSiteName?: string
): Promise<TelegramSendResult> {
  try {
    const settings = await getWebsiteSettingsFromDb();

    const botToken = customBotToken?.trim() || settings.telegram?.botToken?.trim();
    const chatId = customChatId?.trim() || settings.telegram?.chatId?.trim();
    const siteName =
      customSiteName?.trim() ||
      settings.siteName?.trim() ||
      settings.brandName?.trim() ||
      'GameStore VN';

    if (!botToken || !chatId) {
      return {
        success: false,
        error: 'Vui lòng nhập đầy đủ Telegram Bot Token và Chat ID để kiểm tra.',
      };
    }

    const timeStr = formatVNTime(new Date());
    const message = [
      `🤖 <b>KIỂM TRA KẾT NỐI TELEGRAM BOT</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `✅ <b>Trạng thái:</b> Kết nối thành công!`,
      `🏪 <b>Website:</b> <b>${siteName}</b>`,
      `⏰ <b>Thời gian gửi:</b> ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━`,
      `🚀 <i>Bot thông báo tự động cho Admin đã hoạt động bình thường trên hệ thống!</i>`,
    ].join('\n');

    return await sendTelegramMessage(botToken, chatId, message);
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'Lỗi không xác định khi gửi test Telegram.',
    };
  }
}

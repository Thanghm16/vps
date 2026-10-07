import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import {
  getLuckyWheelsCollection,
  getLuckyWheelSpinsCollection,
  getLuckyWheelUserStatsCollection,
  getUsersCollection,
  getTransactionsCollection,
  getOrdersCollection,
  getCouponsCollection,
  getAccountsCollection,
} from '@/lib/db/collections';
import {
  LuckyWheelDocument,
  LuckyWheelReward,
  LuckyWheelSpinDocument,
  LuckyWheelUserStatDocument,
  RewardType,
  ClaimStatus,
} from '@/types/lucky-wheel';
import { SafeUser } from '@/types/auth';
import { TransactionDocument } from '@/types/db-transaction';
import { OrderDocument } from '@/types/db-order';
import { CouponDocument } from '@/types/db-coupon';
import { decryptCredentials } from '@/lib/crypto/encryption';

/**
 * Helper kiểm tra tổng xác suất các phần thưởng có bằng 100% không
 */
export function validateTotalProbability(rewards: LuckyWheelReward[]): {
  isValid: boolean;
  total: number;
  message?: string;
} {
  if (!rewards || rewards.length === 0) {
    return { isValid: false, total: 0, message: 'Vòng quay phải có ít nhất 1 phần thưởng.' };
  }

  // Tính tổng xác suất của các reward đang enabled
  const enabledRewards = rewards.filter((r) => r.enabled);
  if (enabledRewards.length === 0) {
    return { isValid: false, total: 0, message: 'Phải có ít nhất 1 phần thưởng được kích hoạt.' };
  }

  const total = enabledRewards.reduce((sum, r) => sum + (Number(r.probability) || 0), 0);
  const rounded = Math.round(total * 100) / 100;

  // Cho phép sai số nhỏ do dấu chấm động (floating point: 99.95 - 100.05)
  const isValid = Math.abs(rounded - 100) <= 0.05;

  if (!isValid) {
    return {
      isValid: false,
      total: rounded,
      message: `Tổng xác suất các phần thưởng đang kích hoạt phải bằng 100% (Hiện tại: ${rounded}%).`,
    };
  }

  return { isValid: true, total: rounded };
}

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (GMT+7)
 */
export function getVietnamDateString(date = new Date()): string {
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnDate.toISOString().slice(0, 10);
}

/**
 * Thuật toán Weighted Random chuẩn xác trên Server
 * Chỉ chọn các phần thưởng đang enabled và còn số lượng (remainingQuantity > 0 hoặc quantity === -1)
 */
export function selectWeightedReward(rewards: LuckyWheelReward[]): {
  reward: LuckyWheelReward;
  index: number;
} | null {
  if (!rewards || rewards.length === 0) return null;

  // Lọc danh sách phần thưởng hợp lệ
  const candidates: Array<{ reward: LuckyWheelReward; originalIndex: number }> = [];
  rewards.forEach((r, idx) => {
    if (r.enabled && (r.quantity === -1 || r.remainingQuantity > 0)) {
      candidates.push({ reward: r, originalIndex: idx });
    }
  });

  if (candidates.length === 0) {
    // Nếu tất cả giải có giới hạn đều hết hàng, tìm giải NOTHING đầu tiên
    const nothingIdx = rewards.findIndex((r) => r.type === 'NOTHING' && r.enabled);
    if (nothingIdx !== -1) {
      return { reward: rewards[nothingIdx], index: nothingIdx };
    }
    return null;
  }

  // Tính tổng trọng số
  const totalWeight = candidates.reduce((sum, c) => sum + Math.max(0, c.reward.probability), 0);

  if (totalWeight <= 0) {
    // Nếu tổng trọng số = 0, chọn đều giữa các candidate
    const randomIdx = Math.floor(Math.random() * candidates.length);
    return {
      reward: candidates[randomIdx].reward,
      index: candidates[randomIdx].originalIndex,
    };
  }

  // Sinh số ngẫu nhiên an toàn [0, totalWeight)
  const randomValue = (crypto.randomBytes(4).readUInt32LE(0) / 0xffffffff) * totalWeight;

  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += Math.max(0, candidate.reward.probability);
    if (randomValue <= cumulative) {
      return {
        reward: candidate.reward,
        index: candidate.originalIndex,
      };
    }
  }

  // Fallback an toàn về candidate cuối cùng
  const last = candidates[candidates.length - 1];
  return { reward: last.reward, index: last.originalIndex };
}

export interface SpinExecutionParams {
  wheelId: string | ObjectId;
  user: SafeUser;
  idempotencyKey?: string;
  ip?: string;
}

export interface SpinExecutionResult {
  success: boolean;
  message: string;
  rewardIndex?: number;
  reward?: {
    id: string;
    name: string;
    type: RewardType;
    description?: string;
    image?: string;
    value: number;
    color?: string;
    textColor?: string;
  };
  claimStatus?: ClaimStatus;
  claimDetails?: Record<string, unknown>;
  userStats?: {
    freeSpinsRemaining: number;
    bonusSpinsRemaining: number;
    totalAvailableSpins: number;
    dailySpinsRemaining: number | null;
    totalSpinsUsed: number;
    currentBalance: number;
  };
  spinId?: string;
}

/**
 * Hàm xử lý lượt quay may mắn hoàn chỉnh với Atomic Concurrency, Server Random, Idempotency & Reward Fulfillment
 */
export async function executeSpin({
  wheelId,
  user,
  idempotencyKey,
  ip = '127.0.0.1',
}: SpinExecutionParams): Promise<SpinExecutionResult> {
  const wheelObjId = typeof wheelId === 'string' ? new ObjectId(wheelId) : wheelId;
  const userObjId = new ObjectId(user.id);
  const now = new Date();
  const todayStr = getVietnamDateString(now);

  const wheelsCol = await getLuckyWheelsCollection();
  const spinsCol = await getLuckyWheelSpinsCollection();
  const userStatsCol = await getLuckyWheelUserStatsCollection();
  const usersCol = await getUsersCollection();
  const txCol = await getTransactionsCollection();
  const ordersCol = await getOrdersCollection();
  const couponsCol = await getCouponsCollection();
  const accountsCol = await getAccountsCollection();

  // 1. IDEMPOTENCY CHECK: Nếu request đã xử lý thành công trước đó với cùng key
  if (idempotencyKey && typeof idempotencyKey === 'string') {
    const existingSpin = await spinsCol.findOne({
      idempotencyKey: idempotencyKey.trim(),
      userId: userObjId,
    });
    if (existingSpin) {
      // Tìm lại index trong vòng quay
      const wheel = await wheelsCol.findOne({ _id: wheelObjId });
      const rewardIndex = wheel?.rewards?.findIndex((r) => r.id === existingSpin.rewardId) ?? 0;
      const freshUser = await usersCol.findOne({ _id: userObjId });

      return {
        success: true,
        message: 'Lượt quay đã được xử lý thành công trước đó.',
        rewardIndex: rewardIndex >= 0 ? rewardIndex : 0,
        reward: {
          id: existingSpin.rewardId,
          name: existingSpin.rewardName,
          type: existingSpin.rewardType,
          image: existingSpin.rewardImage,
          value: existingSpin.rewardValue,
        },
        claimStatus: existingSpin.claimStatus,
        claimDetails: existingSpin.claimDetails,
        userStats: {
          freeSpinsRemaining: 0,
          bonusSpinsRemaining: 0,
          totalAvailableSpins: 0,
          dailySpinsRemaining: null,
          totalSpinsUsed: existingSpin.spinNumber,
          currentBalance: freshUser?.balance || 0,
        },
        spinId: existingSpin._id?.toString(),
      };
    }
  }

  // 2. TÌM VÀ KIỂM TRA TRẠNG THÁI VÒNG QUAY
  const wheel = await wheelsCol.findOne({ _id: wheelObjId });
  if (!wheel) {
    return { success: false, message: 'Vòng quay may mắn không tồn tại.' };
  }

  if (!wheel.enabled || wheel.status === 'inactive' || wheel.status === 'draft') {
    return { success: false, message: 'Vòng quay hiện đang tạm đóng hoặc chưa được kích hoạt.' };
  }

  // Kiểm tra thời gian bắt đầu
  if (wheel.startAt && new Date(wheel.startAt) > now) {
    return {
      success: false,
      message: `Chương trình chưa bắt đầu. Thời gian mở: ${new Date(wheel.startAt).toLocaleString('vi-VN')}`,
    };
  }

  // Kiểm tra thời gian kết thúc
  if (wheel.endAt && new Date(wheel.endAt) < now) {
    return {
      success: false,
      message: 'Chương trình vòng quay may mắn đã kết thúc.',
    };
  }

  // 3. TÍNH TOÁN VÀ KIỂM TRA LƯỢT QUAY CỦA USER
  let userStatDoc = await userStatsCol.findOne({
    userId: userObjId,
    wheelId: wheelObjId,
  });

  if (!userStatDoc) {
    // Khởi tạo stat cho user nếu chưa có
    const initialStat: LuckyWheelUserStatDocument = {
      userId: userObjId,
      wheelId: wheelObjId,
      freeSpinsUsed: 0,
      bonusSpins: 0,
      totalSpins: 0,
      dailyDate: todayStr,
      dailySpinsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const insRes = await userStatsCol.insertOne(initialStat);
    userStatDoc = { ...initialStat, _id: insRes.insertedId };
  }

  const userStat = userStatDoc;

  // Reset daily spin count nếu sang ngày mới
  const isNewDay = userStat.dailyDate !== todayStr;
  const currentDailySpins = isNewDay ? 0 : userStat.dailySpinsCount || 0;

  // Kiểm tra Daily Limit
  if (wheel.dailySpinLimit && wheel.dailySpinLimit > 0) {
    if (currentDailySpins >= wheel.dailySpinLimit) {
      return {
        success: false,
        message: `Bạn đã đạt giới hạn tối đa ${wheel.dailySpinLimit} lượt quay trong ngày hôm nay. Hãy quay lại vào ngày mai!`,
      };
    }
  }

  // Kiểm tra Max Spins Per User (toàn bộ sự kiện)
  if (wheel.maxSpinsPerUser && wheel.maxSpinsPerUser > 0) {
    if (userStat.totalSpins >= wheel.maxSpinsPerUser) {
      return {
        success: false,
        message: `Bạn đã đạt giới hạn tối đa ${wheel.maxSpinsPerUser} lượt quay cho sự kiện này.`,
      };
    }
  }

  // Tính số lượt quay có sẵn
  const freeSpinsAvailable = Math.max(0, (wheel.freeSpinsPerUser || 0) - (userStat.freeSpinsUsed || 0));
  const bonusSpinsAvailable = Math.max(0, userStat.bonusSpins || 0);

  let costType: 'free' | 'bonus' | 'wallet' = 'free';
  let spinCost = 0;

  if (freeSpinsAvailable > 0) {
    costType = 'free';
    spinCost = 0;
  } else if (bonusSpinsAvailable > 0) {
    costType = 'bonus';
    spinCost = 0;
  } else {
    // Phải thanh toán bằng số dư ví
    if (wheel.spinCost <= 0) {
      costType = 'free';
      spinCost = 0;
    } else {
      costType = 'wallet';
      spinCost = wheel.spinCost;

      // Kiểm tra số dư người dùng
      const freshUser = await usersCol.findOne({ _id: userObjId });
      const currentBalance = freshUser?.balance || 0;

      if (currentBalance < spinCost) {
        return {
          success: false,
          message: `Số dư ví không đủ (${currentBalance.toLocaleString('vi-VN')} ₫). Bạn cần ${spinCost.toLocaleString('vi-VN')} ₫ để thực hiện lượt quay.`,
        };
      }
    }
  }

  // 4. SERVER-SIDE WEIGHTED RANDOM SELECTION
  let selected = selectWeightedReward(wheel.rewards);
  if (!selected) {
    return { success: false, message: 'Hiện không có phần thưởng nào khả dụng trên vòng quay.' };
  }

  let selectedReward = selected.reward;
  let rewardIndex = selected.index;

  // 5. ATOMIC RACE-CONDITION CONCURRENCY LOCK (NẾU PHẦN THƯỞNG CÓ GIỚI HẠN SỐ LƯỢNG)
  if (selectedReward.quantity !== -1) {
    const decResult = await wheelsCol.findOneAndUpdate(
      {
        _id: wheelObjId,
        'rewards.id': selectedReward.id,
        'rewards.remainingQuantity': { $gt: 0 },
      },
      {
        $inc: { 'rewards.$.remainingQuantity': -1 },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' }
    );

    // Nếu trừ số lượng thất bại (do user khác đã quay trúng phần quà cuối cùng trong cùng mili-giây)
    if (!decResult) {
      // Re-roll lại lần nữa với dữ liệu mới
      const updatedWheel = await wheelsCol.findOne({ _id: wheelObjId });
      const fallbackSelected = selectWeightedReward(updatedWheel?.rewards || []);
      if (!fallbackSelected) {
        return { success: false, message: 'Phần thưởng vừa hết, vui lòng thử lại.' };
      }
      selectedReward = fallbackSelected.reward;
      rewardIndex = fallbackSelected.index;

      // Nếu phần thưởng mới cũng có giới hạn, thử trừ lại
      if (selectedReward.quantity !== -1) {
        const retryDec = await wheelsCol.findOneAndUpdate(
          {
            _id: wheelObjId,
            'rewards.id': selectedReward.id,
            'rewards.remainingQuantity': { $gt: 0 },
          },
          {
            $inc: { 'rewards.$.remainingQuantity': -1 },
            $set: { updatedAt: now },
          }
        );
        if (!retryDec) {
          // Fallback cuối cùng: Chuyển về giải NOTHING
          const nothingReward = wheel.rewards.find((r) => r.type === 'NOTHING') || {
            id: 'fallback-nothing',
            name: 'Chúc bạn may mắn lần sau',
            type: 'NOTHING' as RewardType,
            value: 0,
            quantity: -1,
            remainingQuantity: -1,
            probability: 100,
            enabled: true,
            sortOrder: 0,
          };
          selectedReward = nothingReward;
          rewardIndex = Math.max(
            0,
            wheel.rewards.findIndex((r) => r.id === nothingReward.id)
          );
        }
      }
    }
  }

  // 6. ATOMIC TRỪ TIỀN / LƯỢT QUAY CỦA USER
  if (costType === 'wallet' && spinCost > 0) {
    const deductBalance = await usersCol.updateOne(
      { _id: userObjId, balance: { $gte: spinCost } },
      {
        $inc: { balance: -spinCost },
        $set: { updatedAt: now },
      }
    );

    if (deductBalance.modifiedCount === 0) {
      // Rollback số lượng giải thưởng nếu trừ tiền thất bại
      if (selectedReward.quantity !== -1) {
        await wheelsCol.updateOne(
          { _id: wheelObjId, 'rewards.id': selectedReward.id },
          { $inc: { 'rewards.$.remainingQuantity': 1 } }
        );
      }
      return {
        success: false,
        message: 'Số dư ví không đủ hoặc xảy ra xung đột khi trừ tiền.',
      };
    }

    // Tạo bản ghi giao dịch trừ tiền quay
    const txCode = `TX-SPIN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const txDoc: TransactionDocument = {
      code: txCode,
      amount: spinCost,
      status: 'success',
      gateway: 'LuckyWheel',
      transferType: 'out',
      transactionDate: now.toISOString(),
      content: `Quay Vòng Quay May Mắn: ${wheel.name}`,
      customerName: user.username,
      accountNumber: String(user.userCode || user.username),
      createdAt: now,
      updatedAt: now,
    };
    await txCol.insertOne(txDoc);
  }

  // 7. CẬP NHẬT STATS CỦA USER (ATOMIC)
  const statUpdate: any = {
    $inc: { totalSpins: 1 },
    $set: {
      dailyDate: todayStr,
      dailySpinsCount: isNewDay ? 1 : currentDailySpins + 1,
      updatedAt: now,
    },
  };

  if (costType === 'free') {
    statUpdate.$inc.freeSpinsUsed = 1;
  } else if (costType === 'bonus') {
    statUpdate.$inc.bonusSpins = -1;
  }

  await userStatsCol.updateOne({ userId: userObjId, wheelId: wheelObjId }, statUpdate);

  // 8. TỰ ĐỘNG CẤP PHẦN THƯỞNG (REWARD FULFILLMENT)
  let claimStatus: ClaimStatus = 'NOT_APPLICABLE';
  const claimDetails: Record<string, unknown> = {};

  try {
    switch (selectedReward.type) {
      case 'MONEY': {
        if (selectedReward.value > 0) {
          await usersCol.updateOne(
            { _id: userObjId },
            { $inc: { balance: selectedReward.value }, $set: { updatedAt: now } }
          );

          const prizeTxCode = `TX-PRIZE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
          const prizeTxDoc: TransactionDocument = {
            code: prizeTxCode,
            amount: selectedReward.value,
            status: 'success',
            gateway: 'LuckyWheel',
            transferType: 'in',
            transactionDate: now.toISOString(),
            content: `Trúng thưởng ${selectedReward.value.toLocaleString('vi-VN')} ₫ từ ${wheel.name}`,
            customerName: user.username,
            accountNumber: String(user.userCode || user.username),
            createdAt: now,
            updatedAt: now,
          };
          await txCol.insertOne(prizeTxDoc);

          claimStatus = 'CLAIMED';
          claimDetails.transactionCode = prizeTxCode;
          claimDetails.balanceAdded = selectedReward.value;
        }
        break;
      }

      case 'EXTRA_SPIN': {
        if (selectedReward.value > 0) {
          await userStatsCol.updateOne(
            { userId: userObjId, wheelId: wheelObjId },
            { $inc: { bonusSpins: selectedReward.value }, $set: { updatedAt: now } }
          );
          claimStatus = 'CLAIMED';
          claimDetails.extraSpinsAdded = selectedReward.value;
        }
        break;
      }

      case 'COUPON': {
        const couponPrefix = `SPIN-${wheel.slug.toUpperCase().slice(0, 4)}`;
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const generatedCode = `${couponPrefix}-${randomSuffix}`;
        const isPercent = !!selectedReward.metadata?.couponDiscountPercent;
        const discountVal = isPercent
          ? selectedReward.metadata?.couponDiscountPercent || selectedReward.value
          : selectedReward.value;

        const newCoupon: CouponDocument = {
          code: generatedCode,
          description: `Voucher quà tặng từ ${wheel.name}`,
          type: isPercent ? 'percentage' : 'fixed',
          value: discountVal,
          minOrderValue: selectedReward.metadata?.couponMinOrder || 0,
          maxDiscount: selectedReward.metadata?.couponMaxDiscount || null,
          usageLimit: 1,
          usedCount: 0,
          usageLimitPerUser: 1,
          startAt: now,
          endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Hạn 30 ngày
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        await couponsCol.insertOne(newCoupon);
        claimStatus = 'CLAIMED';
        claimDetails.couponCode = generatedCode;
        claimDetails.discountValue = discountVal;
        break;
      }

      case 'ACCOUNT': {
        let targetAccount = null;
        if (selectedReward.metadata?.accountId) {
          try {
            targetAccount = await accountsCol.findOneAndUpdate(
              {
                _id: new ObjectId(selectedReward.metadata.accountId),
                status: 'available',
              },
              {
                $set: {
                  status: 'sold',
                  buyerId: userObjId,
                  buyerUsername: user.username,
                  soldAt: now,
                  updatedAt: now,
                },
              },
              { returnDocument: 'after' }
            );
          } catch {
            targetAccount = null;
          }
        }

        // Nếu không có account cụ thể, tìm nick ngẫu nhiên của game (nếu có gameSlug)
        if (!targetAccount && selectedReward.metadata?.gameSlug) {
          targetAccount = await accountsCol.findOneAndUpdate(
            {
              gameSlug: selectedReward.metadata.gameSlug,
              status: 'available',
            },
            {
              $set: {
                status: 'sold',
                buyerId: userObjId,
                buyerUsername: user.username,
                soldAt: now,
                updatedAt: now,
              },
            },
            { returnDocument: 'after' }
          );
        }

        if (targetAccount) {
          const decryptedCreds = decryptCredentials(targetAccount.credentials);
          const orderTimestamp = Date.now().toString().slice(-6);
          const orderCode = `DH-LUCKY-${orderTimestamp}`;

          const luckyOrder: OrderDocument = {
            code: orderCode,
            accountId: targetAccount._id,
            accountCode: targetAccount.code,
            accountTitle: targetAccount.title,
            accountThumbnail: targetAccount.thumbnail || targetAccount.images?.[0] || '',
            gameSlug: targetAccount.gameSlug || '',
            gameName: targetAccount.gameName || '',
            amount: 0,
            subtotal: targetAccount.price || 0,
            discountAmount: targetAccount.price || 0,
            paymentMethod: 'wallet',
            status: 'delivered',
            customerName: user.username,
            customerEmail: user.email,
            userId: userObjId,
            username: user.username,
            deliveryCredentials: {
              username: decryptedCreds?.loginUsername || targetAccount.credentials?.loginUsername || '',
              password: decryptedCreds?.loginPassword || targetAccount.credentials?.loginPassword || '',
              twoFactorCode: decryptedCreds?.twoFactorCode || targetAccount.credentials?.twoFactorCode || '',
              emailBound: decryptedCreds?.emailBound || targetAccount.credentials?.emailBound || '',
              phoneBound: decryptedCreds?.phoneBound || targetAccount.credentials?.phoneBound || '',
              note: `Trúng thưởng từ ${wheel.name}`,
            },
            createdAt: now,
            updatedAt: now,
          };

          await ordersCol.insertOne(luckyOrder);
          claimStatus = 'CLAIMED';
          claimDetails.orderCode = orderCode;
          claimDetails.accountCode = targetAccount.code;
          claimDetails.gameName = targetAccount.gameName;
        } else {
          claimStatus = 'FAILED';
          claimDetails.note = 'Tạm thời chưa thể xuất nick tự động. Ban quản trị sẽ liên hệ trao thưởng trực tiếp.';
        }
        break;
      }

      case 'PRODUCT': {
        claimStatus = 'CLAIMED';
        claimDetails.productName = selectedReward.metadata?.productName || selectedReward.name;
        break;
      }

      case 'NOTHING':
      default: {
        claimStatus = 'NOT_APPLICABLE';
        break;
      }
    }
  } catch (err) {
    console.error('[LuckyWheel Fulfillment Error]:', err);
    claimStatus = 'FAILED';
    claimDetails.error = (err as Error).message;
  }

  // 9. LƯU BẢN GHI LƯỢT QUAY (LUCKYWHEELSPIN)
  const currentSpinNumber = (userStat.totalSpins || 0) + 1;
  const spinDoc: LuckyWheelSpinDocument = {
    idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
    wheelId: wheelObjId,
    wheelName: wheel.name,
    userId: userObjId,
    username: user.username,
    customerName: user.username,
    rewardId: selectedReward.id,
    rewardName: selectedReward.name,
    rewardType: selectedReward.type,
    rewardValue: selectedReward.value,
    rewardImage: selectedReward.image,
    spinNumber: currentSpinNumber,
    cost: spinCost,
    costType,
    status: 'SUCCESS',
    claimStatus,
    claimDetails,
    ip,
    createdAt: now,
  };

  const insertSpinRes = await spinsCol.insertOne(spinDoc);

  // 10. TÍNH TOÁN USER STATS MỚI ĐỂ PHẢN HỒI CHO CLIENT
  const updatedUser = await usersCol.findOne({ _id: userObjId });
  const finalFreeRemaining = Math.max(
    0,
    (wheel.freeSpinsPerUser || 0) - ((userStat.freeSpinsUsed || 0) + (costType === 'free' ? 1 : 0))
  );
  const finalBonusRemaining = Math.max(
    0,
    (userStat.bonusSpins || 0) -
      (costType === 'bonus' ? 1 : 0) +
      (selectedReward.type === 'EXTRA_SPIN' ? selectedReward.value : 0)
  );
  const finalDailyRemaining =
    wheel.dailySpinLimit && wheel.dailySpinLimit > 0
      ? Math.max(0, wheel.dailySpinLimit - (isNewDay ? 1 : currentDailySpins + 1))
      : null;

  return {
    success: true,
    message:
      selectedReward.type === 'NOTHING'
        ? 'Chúc bạn may mắn lần sau!'
        : `Chúc mừng bạn đã trúng: ${selectedReward.name}!`,
    rewardIndex,
    reward: {
      id: selectedReward.id,
      name: selectedReward.name,
      type: selectedReward.type,
      description: selectedReward.description,
      image: selectedReward.image,
      value: selectedReward.value,
      color: selectedReward.color,
      textColor: selectedReward.textColor,
    },
    claimStatus,
    claimDetails,
    userStats: {
      freeSpinsRemaining: finalFreeRemaining,
      bonusSpinsRemaining: finalBonusRemaining,
      totalAvailableSpins: finalFreeRemaining + finalBonusRemaining,
      dailySpinsRemaining: finalDailyRemaining,
      totalSpinsUsed: currentSpinNumber,
      currentBalance: updatedUser?.balance || 0,
    },
    spinId: insertSpinRes.insertedId.toString(),
  };
}

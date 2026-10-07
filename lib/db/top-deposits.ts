import { ObjectId } from 'mongodb';
import { getTransactionsCollection, getUsersCollection } from './collections';
import { TopDepositor } from '@/types/account';

function getVipTier(amount: number): string {
  if (amount >= 50_000_000) return 'VIP Kim Cương';
  if (amount >= 10_000_000) return 'VIP 4';
  if (amount >= 3_000_000) return 'VIP 3';
  if (amount >= 1_000_000) return 'VIP 2';
  if (amount >= 200_000) return 'VIP 1';
  return 'Thành viên';
}

function extractUserCodeFromText(text?: string | null): number | null {
  if (!text) return null;
  const match = text.match(/NAP[_ ]?U?([0-9]{4,8})/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Lấy danh sách Top nạp tiền tối ưu bằng Aggregation Pipeline
 * Tuyệt đối không load toàn bộ bảng users vào memory
 */
export async function getTopDepositorsFromDb(
  period: string = 'month',
  limit: number = 5
): Promise<TopDepositor[]> {
  const txCol = await getTransactionsCollection();
  const usersCol = await getUsersCollection();

  const now = new Date();
  const matchStage: Record<string, unknown> = {
    transferType: 'in',
    status: 'success',
  };

  if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    matchStage.createdAt = { $gte: startOfMonth };
  }

  // 1. Group transactions và lấy Top nạp
  const aggregatedGroups = await txCol
    .aggregate<{
      _id: unknown;
      totalAmount: number;
      transactionsCount: number;
      sampleTx: Record<string, any>;
    }>([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $ifNull: ['$userId', { $ifNull: ['$username', '$customerName'] }],
          },
          totalAmount: { $sum: '$amount' },
          transactionsCount: { $sum: 1 },
          sampleTx: { $first: '$$ROOT' },
        },
      },
      { $match: { totalAmount: { $gt: 0 } } },
      { $sort: { totalAmount: -1 } },
      { $limit: Math.min(10, Math.max(1, limit)) },
    ])
    .toArray();

  if (aggregatedGroups.length === 0) {
    return [];
  }

  // 2. Thu thập User ID, usernames và userCodes CHỈ CỦA TOP 5-10 RECORDS
  const userIdsToFetch: ObjectId[] = [];
  const usernamesToFetch: string[] = [];
  const userCodesToFetch: number[] = [];

  for (const group of aggregatedGroups) {
    const sample = group.sampleTx;
    if (sample.userId && ObjectId.isValid(sample.userId)) {
      userIdsToFetch.push(new ObjectId(sample.userId));
    }
    if (sample.username) {
      usernamesToFetch.push(sample.username.toLowerCase());
    }
    const code =
      extractUserCodeFromText(sample.paymentCode) ||
      extractUserCodeFromText(sample.customerName) ||
      extractUserCodeFromText(sample.content);
    if (code) {
      userCodesToFetch.push(code);
    }
  }

  // 3. Chỉ truy vấn duy nhất nhóm user liên quan (Tối đa 5-10 documents)
  const orConditions: Record<string, unknown>[] = [];
  if (userIdsToFetch.length > 0) orConditions.push({ _id: { $in: userIdsToFetch } });
  if (usernamesToFetch.length > 0) orConditions.push({ username: { $in: usernamesToFetch } });
  if (userCodesToFetch.length > 0) orConditions.push({ userCode: { $in: userCodesToFetch } });

  const matchedUsers = orConditions.length > 0
    ? await usersCol
        .find({ $or: orConditions })
        .project({ _id: 1, username: 1, avatar: 1, userCode: 1 })
        .toArray()
    : [];

  const userById = new Map(matchedUsers.map((u) => [u._id.toString(), u]));
  const userByUsername = new Map(matchedUsers.map((u) => [u.username.toLowerCase(), u]));
  const userByCode = new Map(
    matchedUsers
      .filter((u) => typeof u.userCode === 'number')
      .map((u) => [u.userCode, u])
  );

  // 4. Map kết quả cuối cùng
  return aggregatedGroups.map((group, idx) => {
    const sample = group.sampleTx;
    let matchedUser = undefined;

    if (sample.userId) {
      matchedUser = userById.get(sample.userId.toString());
    }
    if (!matchedUser && sample.username) {
      matchedUser = userByUsername.get(sample.username.toLowerCase());
    }
    if (!matchedUser) {
      const code =
        extractUserCodeFromText(sample.paymentCode) ||
        extractUserCodeFromText(sample.customerName) ||
        extractUserCodeFromText(sample.content);
      if (code) {
        matchedUser = userByCode.get(code);
      }
    }

    const displayName =
      matchedUser?.username || sample.username || sample.customerName || 'Game thủ';
    const avatarUrl =
      matchedUser?.avatar && matchedUser.avatar.trim()
        ? matchedUser.avatar
        : '/user-default.jpg';

    return {
      rank: idx + 1,
      name: displayName,
      avatar: avatarUrl,
      amount: group.totalAmount,
      vipTier: getVipTier(group.totalAmount),
      transactionsCount: group.transactionsCount,
    };
  });
}

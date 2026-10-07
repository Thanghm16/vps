import crypto from 'crypto';
import { getUsersCollection, getSessionsCollection } from '@/lib/db/collections';
import { createAccessToken, createRefreshToken, REFRESH_TOKEN_MAX_AGE } from './tokens';
import { hashToken, generateRandomToken } from './password';
import { serializeSafeUser } from './server';
import { UserDocument, SafeUser } from '@/types/auth';

import { getWebsiteSettingsFromDb } from '@/lib/db/settings';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Lấy App Base URL cho Redirect URI
 */
export function getAppUrl(customBaseUrl?: string): string {
  let appUrl = customBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (appUrl.endsWith('/')) {
    appUrl = appUrl.slice(0, -1);
  }
  return appUrl;
}

/**
 * Lấy thông tin cấu hình Google OAuth 2.0 từ MongoDB Settings (với fallback ENV)
 */
export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig | null> {
  const dbSettings = await getWebsiteSettingsFromDb();

  // Kiểm tra nếu tính năng Đăng nhập Google bị tắt trong Admin Settings
  if (dbSettings.googleAuth?.enabled === false) {
    return null;
  }
  
  const clientId =
    dbSettings.googleAuth?.clientId?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
    
  const clientSecret =
    dbSettings.googleAuth?.clientSecret?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    '';

  if (!clientId) {
    return null;
  }

  const appUrl = getAppUrl(dbSettings.siteUrl);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

/**
 * Tạo Signed State Token bảo vệ chống tấn công CSRF cho luồng OAuth 2.0
 */
export function createOAuthState(redirectPath: string = '/'): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const rawData = JSON.stringify({
    redirectPath: redirectPath && redirectPath.startsWith('/') ? redirectPath : '/',
    nonce,
    timestamp,
  });

  const secret = process.env.JWT_ACCESS_SECRET || 'gamestore_oauth_state_hmac_secret_2026';
  const sig = crypto.createHmac('sha256', secret).update(rawData).digest('hex');

  const payload = JSON.stringify({ data: rawData, sig });
  return Buffer.from(payload).toString('base64url');
}

/**
 * Xác minh tính hợp lệ và thời hạn của OAuth State Token (tối đa 15 phút)
 */
export function verifyOAuthState(stateStr?: string | null): { redirectPath: string } | null {
  if (!stateStr || typeof stateStr !== 'string') return null;

  try {
    const jsonStr = Buffer.from(stateStr, 'base64url').toString('utf8');
    const { data, sig } = JSON.parse(jsonStr);
    if (!data || !sig) return null;

    const secret = process.env.JWT_ACCESS_SECRET || 'gamestore_oauth_state_hmac_secret_2026';
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('hex');

    if (sig !== expectedSig) {
      return null;
    }

    const parsed = JSON.parse(data);
    // State hết hạn sau 15 phút
    if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
      return null;
    }

    return {
      redirectPath: parsed.redirectPath && parsed.redirectPath.startsWith('/') ? parsed.redirectPath : '/',
    };
  } catch {
    return null;
  }
}

/**
 * Tạo URL chuyển hướng đăng nhập Google Accounts
 */
export async function getGoogleAuthUrl(redirectPath: string = '/'): Promise<string | null> {
  const config = await getGoogleOAuthConfig();
  if (!config) return null;

  const state = createOAuthState(redirectPath);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Đổi Authorization Code lấy Tokens và Profile từ Google
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const config = await getGoogleOAuthConfig();
  if (!config) {
    throw new Error('Google OAuth credentials are not configured on server.');
  }

  if (!config.clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET is required to complete OAuth authorization code exchange.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    console.error('[Google OAuth Token Error]:', errorBody);
    throw new Error('Failed to exchange authorization code with Google OAuth.');
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('No access_token returned by Google.');
  }

  // Lấy thông tin tài khoản người dùng từ Google UserInfo API
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) {
    throw new Error('Failed to fetch user profile from Google UserInfo API.');
  }

  const profile: GoogleProfile = await userRes.json();
  if (!profile || !profile.email || !profile.sub) {
    throw new Error('Invalid Google profile response: missing email or sub identifier.');
  }

  return profile;
}

/**
 * Tìm kiếm hoặc khởi tạo UserDocument trong MongoDB cho Google Profile
 */
export async function findOrCreateGoogleUser(
  profile: GoogleProfile,
  userAgent?: string
): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const usersCollection = await getUsersCollection();
  const cleanEmail = profile.email.trim().toLowerCase();

  // 1. Tìm user theo googleId hoặc email đã đăng ký trước đó
  let existingUser = await usersCollection.findOne({
    $or: [{ googleId: profile.sub }, { email: cleanEmail }],
  });

  const now = new Date();

  if (existingUser) {
    // Nếu user bị khóa, ném lỗi
    if (existingUser.status === 'blocked') {
      throw new Error('ACCOUNT_BLOCKED');
    }

    // Cập nhật googleId và avatar nếu chưa có
    const updateFields: Partial<UserDocument> = {
      lastLoginAt: now,
      updatedAt: now,
      emailVerified: true,
    };

    if (!existingUser.googleId) {
      updateFields.googleId = profile.sub;
    }

    if (!existingUser.authProvider) {
      updateFields.authProvider = existingUser.passwordHash ? 'credentials' : 'google';
    }

    if (profile.picture && (!existingUser.avatar || existingUser.avatar === '/user-default.jpg')) {
      updateFields.avatar = profile.picture;
    }

    await usersCollection.updateOne({ _id: existingUser._id }, { $set: updateFields });
    existingUser = { ...existingUser, ...updateFields };
  } else {
    // 2. Tạo tài khoản mới cho người dùng Google
    // Sinh username duy nhất từ email hoặc tên
    let baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
    if (baseUsername.length < 3) {
      baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (baseUsername.length > 15) {
      baseUsername = baseUsername.slice(0, 15);
    }

    let finalUsername = baseUsername;
    let counter = 1;
    while (await usersCollection.findOne({ username: finalUsername })) {
      finalUsername = `${baseUsername.slice(0, 14)}_${counter++}`;
    }

    // Tìm mã UserCode lớn nhất hiện có hoặc khởi tạo từ 10001
    const lastUser = await usersCollection
      .find({ userCode: { $exists: true } })
      .sort({ userCode: -1 })
      .limit(1)
      .toArray();
    const nextUserCode = lastUser.length > 0 && lastUser[0].userCode ? lastUser[0].userCode + 1 : 10001;

    const newUserDoc: UserDocument = {
      userCode: nextUserCode,
      username: finalUsername,
      email: cleanEmail,
      googleId: profile.sub,
      authProvider: 'google',
      role: 'user',
      status: 'active',
      balance: 0,
      avatar: profile.picture || '/user-default.jpg',
      emailVerified: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await usersCollection.insertOne(newUserDoc);
    existingUser = { ...newUserDoc, _id: insertResult.insertedId };
  }

  // 3. Khởi tạo Tokens & Session
  const userIdStr = existingUser._id!.toString();
  const familyId = generateRandomToken(16);

  const accessToken = await createAccessToken({
    userId: userIdStr,
    username: existingUser.username,
    email: existingUser.email,
    role: existingUser.role,
  });

  const refreshToken = await createRefreshToken({
    userId: userIdStr,
    familyId,
    role: existingUser.role,
  });

  const sessions = await getSessionsCollection();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

  await sessions.insertOne({
    userId: existingUser._id!,
    familyId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
    isRevoked: false,
    userAgent,
  });

  return {
    user: serializeSafeUser(existingUser),
    accessToken,
    refreshToken,
  };
}

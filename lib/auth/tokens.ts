import { SignJWT, jwtVerify } from 'jose';
import { AccessTokenPayload, RefreshTokenPayload } from '@/types/auth';

function getJwtAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Config Error] Missing JWT_ACCESS_SECRET in production environment.');
    }
    return new TextEncoder().encode('gamestore_dev_access_secret_super_secure_32chars_min!');
  }
  return new TextEncoder().encode(secret);
}

function getJwtRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Config Error] Missing JWT_REFRESH_SECRET in production environment.');
    }
    return new TextEncoder().encode('gamestore_dev_refresh_secret_super_secure_32chars_min!');
  }
  return new TextEncoder().encode(secret);
}

export const ACCESS_TOKEN_EXPIRATION = '15m';
export const REFRESH_TOKEN_EXPIRATION = '14d';
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 phút (giây)
export const REFRESH_TOKEN_MAX_AGE = 14 * 24 * 60 * 60; // 14 ngày (giây)

/**
 * Tạo Access Token (thời hạn 15 phút)
 */
export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(getJwtAccessSecret());
}

/**
 * Xác thực Access Token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtAccessSecret());
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Tạo Refresh Token (thời hạn 14 ngày)
 */
export async function createRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRATION)
    .sign(getJwtRefreshSecret());
}

/**
 * Xác thực Refresh Token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtRefreshSecret());
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}

import { ObjectId } from 'mongodb';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'blocked';

export interface UserDocument {
  _id?: ObjectId;
  userCode?: number;         // Mã định danh số ngắn duy nhất (VD: 10028)
  username: string;          // Lowercase, unique
  email: string;             // Lowercase, unique
  passwordHash?: string;     // Bcrypt hash (optional cho người dùng đăng nhập bằng Google)
  googleId?: string;         // Google Account Subject ID
  authProvider?: 'credentials' | 'google';
  role: UserRole;
  status: UserStatus;
  balance: number;           // Số dư ví (VND)
  avatar?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUser {
  id: string;
  userCode?: number;         // Mã định danh số ngắn duy nhất (VD: 10028)
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  balance: number;
  avatar?: string;
  emailVerified: boolean;
  authProvider?: 'credentials' | 'google';
  createdAt: string;
}

export interface SessionDocument {
  _id?: ObjectId;
  userId: ObjectId;
  familyId: string;          // Token family chain for rotation
  refreshTokenHash: string;  // SHA-256 hash of refresh token
  expiresAt: Date;           // TTL index
  createdAt: Date;
  lastUsedAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  previousTokenHash?: string; // Previous token hash during rotation
  graceUntil?: Date;         // Grace period for concurrent requests
  userAgent?: string;
}

export interface PasswordResetDocument {
  _id?: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;         // SHA-256 hash of reset token
  expiresAt: Date;           // TTL index (15 mins)
  used: boolean;
  createdAt: Date;
}

export interface RateLimitDocument {
  _id?: ObjectId;
  key: string;               // e.g. "login:127.0.0.1"
  count: number;
  resetAt: Date;             // TTL index
}

export interface AccessTokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
  familyId: string;
  role?: UserRole;
  tokenVersion?: number;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  message?: string;
  user?: SafeUser;
  data?: T;
}

import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from './tokens';
import { COOKIE_ACCESS_TOKEN } from './cookies';
import { getUsersCollection } from '@/lib/db/collections';
import { SafeUser, UserDocument } from '@/types/auth';

/**
 * Chuyển đổi UserDocument trong MongoDB thành SafeUser (loại bỏ passwordHash và dữ liệu nhạy cảm)
 */
export function serializeSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id ? user._id.toString() : '',
    userCode: user.userCode,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    balance: user.balance || 0,
    avatar: user.avatar || '/user-default.jpg',
    emailVerified: user.emailVerified ?? false,
    authProvider: user.authProvider || (user.googleId ? 'google' : 'credentials'),
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
  };
}

/**
 * Lấy thông tin user hiện tại từ HttpOnly Cookie (dành cho Server Components, Server Actions & Route Handlers)
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

    if (!token) return null;

    const payload = await verifyAccessToken(token);
    if (!payload?.userId) return null;

    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(payload.userId) });

    if (!user || user.status === 'blocked') {
      return null;
    }

    return serializeSafeUser(user);
  } catch {
    return null;
  }
}

/**
 * Yêu cầu người dùng phải đăng nhập (Bảo vệ phía Server)
 */
export async function requireAuth(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Yêu cầu người dùng phải có quyền Administrator (Bảo vệ phía Server)
 */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Kiểm tra CSRF cơ bản dựa trên Request Origin / Host cho các phương thức Mutation
 */
export function verifyCsrfOrigin(request: Request): boolean {
  // Bỏ qua kiểm tra cho GET và HEAD
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    // Nếu không có origin (ví dụ server-to-server hoặc direct), cho phép nếu same host
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

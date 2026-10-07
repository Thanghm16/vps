import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash mật khẩu người dùng với cost 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Đối chiếu mật khẩu nhập vào với password hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash token (Refresh token hoặc Reset token) bằng SHA-256 trước khi lưu vào MongoDB
 * Không lưu plaintext token vào database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Sinh chuỗi token ngẫu nhiên bảo mật cao (cho Password Reset hoặc Opaque Session)
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

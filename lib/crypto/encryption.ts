import crypto from 'crypto';
import { AccountCredentials } from '@/types/db-account';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

let cachedEncryptionKey: Buffer | null = null;

/**
 * Tạo khoá mã hoá 256-bit (32 bytes) từ secret key môi trường (cached)
 */
function getEncryptionKey(): Buffer {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const secret =
    process.env.CREDENTIALS_ENCRYPTION_KEY?.trim() ||
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Config Error] Missing CREDENTIALS_ENCRYPTION_KEY or ENCRYPTION_KEY in production environment.');
    }
    cachedEncryptionKey = crypto.scryptSync('gamestore_dev_secret_key_credentials_aes256_gcm_2026', 'gamestore_credentials_salt_v1', 32);
    return cachedEncryptionKey;
  }
  
  cachedEncryptionKey = crypto.scryptSync(secret, 'gamestore_credentials_salt_v1', 32);
  return cachedEncryptionKey;
}

/**
 * Mã hoá chuỗi văn bản bằng thuật toán AES-256-GCM
 * Định dạng lưu trữ: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptText(plainText?: string): string {
  if (!plainText || typeof plainText !== 'string' || !plainText.trim()) {
    return plainText || '';
  }

  // Nếu chuỗi đã được mã hoá trước đó, không mã hoá lại
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // Chuẩn 12 bytes IV cho AES-GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption Error]:', error);
    return plainText;
  }
}

/**
 * Giải mã chuỗi văn bản đã mã hoá bằng AES-256-GCM
 * Tự động hỗ trợ dữ liệu legacy chưa mã hoá (trả về nguyên bản không lỗi)
 */
export function decryptText(cipherText?: string): string {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.trim()) {
    return cipherText || '';
  }

  // Nếu không có prefix mã hoá thì đây là chuỗi plain text
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText;
  }

  try {
    const raw = cipherText.slice(PREFIX.length);
    const [ivHex, authTagHex, encryptedHex] = raw.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      return cipherText;
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Decryption Error]:', error);
    return cipherText;
  }
}

/**
 * Mã hoá toàn bộ đối tượng AccountCredentials trước khi lưu vào MongoDB
 */
export function encryptCredentials(credentials?: AccountCredentials): AccountCredentials | undefined {
  if (!credentials) return undefined;

  return {
    loginUsername: credentials.loginUsername ? encryptText(credentials.loginUsername) : '',
    loginPassword: credentials.loginPassword ? encryptText(credentials.loginPassword) : '',
    twoFactorCode: credentials.twoFactorCode ? encryptText(credentials.twoFactorCode) : '',
    emailBound: credentials.emailBound ? encryptText(credentials.emailBound) : '',
    phoneBound: credentials.phoneBound ? encryptText(credentials.phoneBound) : '',
    note: credentials.note ? encryptText(credentials.note) : '',
  };
}

/**
 * Giải mã đối tượng AccountCredentials trước khi gửi về cho Admin hoặc sau khi mua thành công
 */
export function decryptCredentials(credentials?: AccountCredentials): AccountCredentials | undefined {
  if (!credentials) return undefined;

  return {
    loginUsername: decryptText(credentials.loginUsername),
    loginPassword: decryptText(credentials.loginPassword),
    twoFactorCode: decryptText(credentials.twoFactorCode),
    emailBound: decryptText(credentials.emailBound),
    phoneBound: decryptText(credentials.phoneBound),
    note: decryptText(credentials.note),
  };
}

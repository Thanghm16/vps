import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSettingsCollection } from '@/lib/db/collections';
import { S3StorageConfig } from '@/types/admin';

export const DEFAULT_S3_CONFIG: S3StorageConfig = {
  endpoint: 'https://s3.cloudfly.vn',
  region: 'us-east-1',
  accessKeyId: process.env.CLOUDFLY_ACCESS_KEY || process.env.S3_ACCESS_KEY || '',
  secretAccessKey: process.env.CLOUDFLY_SECRET_KEY || process.env.S3_SECRET_KEY || '',
  bucket: process.env.CLOUDFLY_BUCKET || process.env.S3_BUCKET || 'gamestore-accounts',
  publicUrl: 'https://s3.cloudfly.vn/gamestore-accounts',
  folder: 'accounts',
};

/**
 * Chuẩn hóa URL S3 Endpoint (bắt buộc luôn có https:// và trích xuất đúng origin sạch)
 */
export function normalizeS3Endpoint(rawEndpoint?: string): string {
  if (!rawEndpoint || !rawEndpoint.trim()) {
    return 'https://s3.cloudfly.vn';
  }
  let endpoint = rawEndpoint.trim();
  // Nếu chưa có protocol, mặc định thêm https://
  if (!/^https?:\/\//i.test(endpoint)) {
    endpoint = `https://${endpoint}`;
  }
  try {
    const parsed = new URL(endpoint);
    return parsed.origin;
  } catch {
    return endpoint.replace(/\/+$/, '');
  }
}

/**
 * Lấy cấu hình S3 Cloudfly đang hoạt động (Ưu tiên cấu hình trong MongoDB Admin, fallback sang .env)
 */
export async function getActiveS3Config(): Promise<S3StorageConfig> {
  try {
    const settingsCol = await getSettingsCollection();
    const doc = await settingsCol.findOne({ key: 'system_settings' });

    if (doc?.s3 && doc.s3.endpoint) {
      const cleanEndpoint = normalizeS3Endpoint(doc.s3.endpoint);
      const cleanBucket = (doc.s3.bucket || DEFAULT_S3_CONFIG.bucket).trim();

      return {
        endpoint: cleanEndpoint,
        region: doc.s3.region?.trim() || DEFAULT_S3_CONFIG.region,
        accessKeyId: doc.s3.accessKeyId?.trim() || DEFAULT_S3_CONFIG.accessKeyId,
        secretAccessKey: doc.s3.secretAccessKey?.trim() || DEFAULT_S3_CONFIG.secretAccessKey,
        bucket: cleanBucket,
        publicUrl: `${cleanEndpoint}/${cleanBucket}`,
        folder: doc.s3.folder?.trim() || 'accounts',
      };
    }
  } catch (error) {
    console.warn('[Cloudfly S3 Config Warning] Lỗi đọc cấu hình từ MongoDB, dùng mặc định:', error);
  }

  const defaultCleanEndpoint = normalizeS3Endpoint(
    process.env.CLOUDFLY_ENDPOINT || process.env.S3_ENDPOINT || DEFAULT_S3_CONFIG.endpoint
  );
  const defaultBucket = (process.env.CLOUDFLY_BUCKET || process.env.S3_BUCKET || DEFAULT_S3_CONFIG.bucket).trim();

  return {
    ...DEFAULT_S3_CONFIG,
    endpoint: defaultCleanEndpoint,
    bucket: defaultBucket,
    publicUrl: `${defaultCleanEndpoint}/${defaultBucket}`,
  };
}

/**
 * Tạo S3Client từ cấu hình S3StorageConfig với endpoint đã được chuẩn hóa an toàn
 */
export function createS3Client(config: S3StorageConfig): S3Client {
  const cleanEndpoint = normalizeS3Endpoint(config.endpoint);

  return new S3Client({
    endpoint: cleanEndpoint,
    region: (config.region && config.region.trim()) || 'us-east-1',
    credentials: {
      accessKeyId: (config.accessKeyId || '').trim(),
      secretAccessKey: (config.secretAccessKey || '').trim(),
    },
    forcePathStyle: true, // Bắt buộc cho các hệ thống S3-compatible như Cloudfly, MinIO
  });
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

/**
 * Upload buffer lên Cloudfly S3 Object Storage với cấu hình động từ MongoDB hoặc tham số
 */
export async function uploadToCloudfly(
  buffer: Buffer,
  fileName: string,
  contentType: string = 'image/jpeg',
  folderOverride?: string,
  customConfig?: S3StorageConfig
): Promise<UploadResult> {
  const config = customConfig || (await getActiveS3Config());
  const cleanEndpoint = normalizeS3Endpoint(config.endpoint);
  const cleanBucket = (config.bucket || '').trim();
  const cleanAccessKey = (config.accessKeyId || '').trim();
  const cleanSecretKey = (config.secretAccessKey || '').trim();

  // Kiểm tra key cấu hình
  if (!cleanAccessKey || !cleanSecretKey) {
    throw new Error(
      'Chưa cấu hình Access Key ID / Secret Key cho S3 Cloudfly trong Admin Settings hoặc .env.'
    );
  }
  if (!cleanBucket) {
    throw new Error('Chưa cấu hình Bucket Name cho S3 Cloudfly trong Admin Settings.');
  }

  const folder = folderOverride || config.folder || 'accounts';
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  const cleanName = fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const key = `${folder}/${Date.now()}-${cleanName.substring(0, 30)}.${ext}`;

  const client = createS3Client({
    ...config,
    endpoint: cleanEndpoint,
    bucket: cleanBucket,
    accessKeyId: cleanAccessKey,
    secretAccessKey: cleanSecretKey,
  });

  const command = new PutObjectCommand({
    Bucket: cleanBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read', // Đảm bảo ảnh có quyền đọc công khai để hiển thị trên web
  });

  await client.send(command);

  // Đường dẫn ảnh đầy đủ bắt đầu bằng https://
  const finalUrl = `${cleanEndpoint}/${cleanBucket}/${key}`;

  return {
    url: finalUrl,
    key,
    size: buffer.length,
  };
}

/**
 * Kiểm tra kết nối S3 Cloudfly bằng cách tải lên một probe test ngắn
 */
export async function testS3Connection(config: S3StorageConfig): Promise<{ success: boolean; message: string }> {
  const cleanEndpoint = normalizeS3Endpoint(config.endpoint);
  const cleanBucket = (config.bucket || '').trim();
  const cleanAccessKey = (config.accessKeyId || '').trim();
  const cleanSecretKey = (config.secretAccessKey || '').trim();

  if (!cleanEndpoint) {
    throw new Error('Thiếu Endpoint S3 (ví dụ: https://s3.cloudfly.vn).');
  }
  if (!cleanBucket) {
    throw new Error('Thiếu Tên Bucket S3 (ví dụ: gamestore-accounts).');
  }
  if (!cleanAccessKey || !cleanSecretKey) {
    throw new Error('Vui lòng nhập đầy đủ Access Key ID và Secret Access Key.');
  }

  try {
    const client = createS3Client({
      ...config,
      endpoint: cleanEndpoint,
      bucket: cleanBucket,
      accessKeyId: cleanAccessKey,
      secretAccessKey: cleanSecretKey,
    });

    const testKey = `_probe_test/connection-${Date.now()}.txt`;
    const testBuffer = Buffer.from(`Cloudfly S3 connection test at ${new Date().toISOString()}`, 'utf-8');

    const command = new PutObjectCommand({
      Bucket: cleanBucket,
      Key: testKey,
      Body: testBuffer,
      ContentType: 'text/plain',
      ACL: 'public-read',
    });

    await client.send(command);

    return {
      success: true,
      message: `Kết nối và ghi file thử nghiệm thành công lên Bucket "${cleanBucket}" tại ${cleanEndpoint}!`,
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; Code?: string };
    const errName = err.name || err.Code || '';
    const errMsg = err.message || '';

    if (errName === 'NoSuchBucket' || errMsg.includes('NoSuchBucket')) {
      throw new Error(`Không tìm thấy Bucket "${cleanBucket}". Vui lòng tạo Bucket trên Cloudfly trước hoặc kiểm tra lại tên.`);
    }
    if (
      errName === 'InvalidAccessKeyId' ||
      errName === 'SignatureDoesNotMatch' ||
      errName === 'AccessDenied' ||
      errMsg.includes('Access Denied') ||
      errMsg.includes('Forbidden')
    ) {
      throw new Error('Access Key ID hoặc Secret Access Key không chính xác, hoặc tài khoản không có quyền ghi vào Bucket.');
    }
    if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
      throw new Error(`Không thể phân giải tên miền Endpoint "${cleanEndpoint}". Vui lòng kiểm tra lại URL.`);
    }

    throw new Error(errMsg || 'Lỗi không xác định khi kết nối S3.');
  }
}

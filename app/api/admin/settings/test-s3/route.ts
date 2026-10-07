import { NextResponse } from 'next/server';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/auth/server';
import { testS3Connection, getActiveS3Config, normalizeS3Endpoint } from '@/lib/s3/cloudfly';
import { S3StorageConfig } from '@/types/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ success: false, message: 'CSRF check failed.' }, { status: 403 });
    }
    await requireAdmin();

    const body = await request.json();
    const activeConfig = await getActiveS3Config();

    // Hỗ trợ cả { s3: { ... } } và { endpoint: ... }
    const s3Payload = (body?.s3 && typeof body.s3 === 'object') ? body.s3 : (body || {});

    const testConfig: S3StorageConfig = {
      endpoint: normalizeS3Endpoint(s3Payload.endpoint || activeConfig.endpoint),
      region: s3Payload.region?.trim() || activeConfig.region || 'us-east-1',
      accessKeyId: s3Payload.accessKeyId?.trim() || activeConfig.accessKeyId,
      secretAccessKey: s3Payload.secretAccessKey?.trim() || activeConfig.secretAccessKey,
      bucket: s3Payload.bucket?.trim() || activeConfig.bucket,
      publicUrl: '',
      folder: s3Payload.folder?.trim() || activeConfig.folder || 'accounts',
    };

    const result = await testS3Connection(testConfig);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên.' }, { status: 403 });
    }
    console.error('[S3 Connection Test Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: (error as Error).message || 'Kiểm tra kết nối S3 thất bại.',
      },
      { status: 400 }
    );
  }
}

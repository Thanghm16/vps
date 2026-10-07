import { BannerValidationResult } from '@/types/db-banner';

/**
 * Kiểm tra tính an toàn của URL (chặn javascript:, data:, vbscript:)
 */
export function isSafeUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return true; // Link rỗng là hợp lệ (banner không có link)
  }

  const clean = url.trim();

  // Chặn các scheme nguy hiểm
  const dangerousPrefixes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lower = clean.toLowerCase();
  for (const prefix of dangerousPrefixes) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) {
      return false;
    }
  }

  // Cho phép URL nội bộ (/account/123, /#kho-nick, ...)
  if (clean.startsWith('/') || clean.startsWith('#') || clean.startsWith('?')) {
    return true;
  }

  // Cho phép URL tuyệt đối http:// hoặc https://
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate dữ liệu banner gửi lên từ Admin
 */
export function validateBannerInput(input: any): BannerValidationResult {
  const errors: Record<string, string> = {};

  // 1. Tiêu đề
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  if (!title) {
    errors.title = 'Vui lòng nhập tiêu đề banner.';
  } else if (title.length > 150) {
    errors.title = 'Tiêu đề banner tối đa 150 ký tự.';
  }

  const subtitle = typeof input?.subtitle === 'string' ? input.subtitle.trim() : '';

  // 2. Ảnh Desktop (Bắt buộc)
  let desktopImageUrl = '';
  let desktopImagePublicId = '';

  if (typeof input?.desktopImage === 'string') {
    desktopImageUrl = input.desktopImage.trim();
  } else if (typeof input?.desktopImage === 'object' && input.desktopImage?.url) {
    desktopImageUrl = String(input.desktopImage.url).trim();
    desktopImagePublicId = String(input.desktopImage.publicId || '').trim();
  } else if (typeof input?.imageUrl === 'string') {
    // Legacy fallback
    desktopImageUrl = input.imageUrl.trim();
  }

  if (!desktopImageUrl) {
    errors.desktopImage = 'Vui lòng tải lên hoặc nhập URL ảnh Desktop.';
  } else if (!isSafeUrl(desktopImageUrl)) {
    errors.desktopImage = 'Đường dẫn ảnh Desktop không hợp lệ hoặc không an toàn.';
  }

  // 3. Ảnh Mobile (Tùy chọn, fallback sang desktop nếu không có)
  let mobileImageUrl = '';
  let mobileImagePublicId = '';

  if (typeof input?.mobileImage === 'string') {
    mobileImageUrl = input.mobileImage.trim();
  } else if (typeof input?.mobileImage === 'object' && input.mobileImage?.url) {
    mobileImageUrl = String(input.mobileImage.url).trim();
    mobileImagePublicId = String(input.mobileImage.publicId || '').trim();
  }

  if (mobileImageUrl && !isSafeUrl(mobileImageUrl)) {
    errors.mobileImage = 'Đường dẫn ảnh Mobile không hợp lệ hoặc không an toàn.';
  }

  // 4. Chữ nút bấm (CTA)
  const buttonText = typeof input?.buttonText === 'string'
    ? input.buttonText.trim()
    : typeof input?.ctaText === 'string'
    ? input.ctaText.trim()
    : 'Xem Ngay';

  // 5. Đường dẫn khi bấm (Link)
  const link = typeof input?.link === 'string' ? input.link.trim() : '';
  if (link && !isSafeUrl(link)) {
    errors.link = 'Đường dẫn liên kết không hợp lệ hoặc chứa mã độc hại.';
  }

  // 6. Mở trong tab mới
  const openInNewTab = Boolean(input?.openInNewTab);

  // 7. Thứ tự hiển thị
  const sortOrder = typeof input?.sortOrder === 'number' && !isNaN(input.sortOrder)
    ? Math.max(0, Math.floor(input.sortOrder))
    : Number(input?.sortOrder) || 1;

  // 8. Trạng thái kích hoạt
  const isActive = input?.isActive !== undefined ? Boolean(input.isActive) : input?.status === 'active' || true;

  // 9. Thời gian bắt đầu và kết thúc
  let startAt: Date | null = null;
  let endAt: Date | null = null;

  if (input?.startAt) {
    const parsedStart = new Date(input.startAt);
    if (isNaN(parsedStart.getTime())) {
      errors.startAt = 'Thời gian bắt đầu không hợp lệ.';
    } else {
      startAt = parsedStart;
    }
  }

  if (input?.endAt) {
    const parsedEnd = new Date(input.endAt);
    if (isNaN(parsedEnd.getTime())) {
      errors.endAt = 'Thời gian kết thúc không hợp lệ.';
    } else {
      endAt = parsedEnd;
    }
  }

  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    errors.endAt = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors: {},
    sanitized: {
      title,
      subtitle,
      desktopImage: {
        url: desktopImageUrl,
        ...(desktopImagePublicId ? { publicId: desktopImagePublicId } : {}),
      },
      ...(mobileImageUrl
        ? {
            mobileImage: {
              url: mobileImageUrl,
              ...(mobileImagePublicId ? { publicId: mobileImagePublicId } : {}),
            },
          }
        : {}),
      buttonText,
      link,
      openInNewTab,
      sortOrder,
      isActive,
      startAt,
      endAt,
    },
  };
}

/**
 * Format số tiền sang định dạng tiền tệ Việt Nam (VND), ví dụ: 579000 -> 579.000 ₫
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' ₫';
}

/**
 * Format số lượng lớn, ví dụ: 1420 -> 1.420
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Helper ghép classNames
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Tự động tạo URL slug từ tên tiếng Việt chuẩn SEO
 * Ví dụ: "Liên Quân Mobile" -> "lien-quan-mobile"
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Tách dấu ra khỏi chữ cái
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
    .replace(/[đĐ]/g, 'd') // Thay đ, Đ thành d
    .replace(/[^a-z0-9\s-]/g, '') // Xóa ký tự đặc biệt
    .trim()
    .replace(/[\s_]+/g, '-') // Đổi khoảng trắng và gạch dưới thành gạch ngang
    .replace(/-+/g, '-'); // Xóa gạch ngang trùng lặp
}

/**
 * Format thời gian tương đối chuẩn tiếng Việt (vd: Vừa xong, 5 phút trước, 2 giờ trước, 1 ngày trước)
 */
export function formatRelativeTime(dateInput?: Date | string | number | null): string {
  if (!dateInput) return 'Vừa xong';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  } catch {
    return 'Vừa xong';
  }
}


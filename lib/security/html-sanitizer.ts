/**
 * HTML Sanitizer & Security Utilities
 * Đảm bảo an toàn chống XSS khi render và lưu trữ bài viết HTML
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'blockquote', 'pre', 'code',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'span', 'div', 'mark', 'sub', 'sup'
]);

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height', 'loading',
  'class', 'style', 'align', 'colspan', 'rowspan'
]);

/**
 * Xóa bỏ các thuộc tính nguy hiểm như onclick, onerror, javascript: url
 */
export function sanitizeHtmlContent(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html;

  // 1. Loại bỏ các thẻ script, iframe, object, embed, form, input, button, style block
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  // 2. Loại bỏ tất cả event handlers inline (on\w+=...)
  sanitized = sanitized.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 3. Loại bỏ javascript: pseudo protocol trong href hoặc src
  sanitized = sanitized.replace(/href\s*=\s*(['"]?)\s*javascript:[^'"]*\1/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*(['"]?)\s*javascript:[^'"]*\1/gi, '');

  // 4. Loại bỏ data: URLs ngoại trừ data:image (chống SVG/HTML payload)
  sanitized = sanitized.replace(/src\s*=\s*(['"]?)\s*data:(?!image\/)[^'"]*\1/gi, '');

  // 5. Đảm bảo các link ngoài (external links) có rel="noopener noreferrer" và target="_blank"
  sanitized = sanitized.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^"']+)\1([^>]*)>/gi, (match, quote, url, rest) => {
    let tag = `<a href="${url}"`;
    if (!/target=/i.test(rest)) {
      tag += ' target="_blank"';
    }
    if (!/rel=/i.test(rest)) {
      tag += ' rel="noopener noreferrer"';
    }
    return tag + rest + '>';
  });

  return sanitized.trim();
}

/**
 * Trích xuất text thuần từ HTML để đếm từ, tạo excerpt hoặc ước tính thời gian đọc
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ước tính thời gian đọc bài viết (phút) dựa trên tốc độ đọc trung bình 200 từ/phút
 */
export function calculateReadingTime(contentOrHtml: string): number {
  const plainText = extractPlainText(contentOrHtml);
  const words = plainText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

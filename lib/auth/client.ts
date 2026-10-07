/**
 * Client-side fetch wrapper với cơ chế tự động refresh token khi gặp 401
 * Tuyệt đối không lưu trữ bất kỳ token nào trong localStorage / sessionStorage.
 * Mọi request đều gửi kèm HttpOnly cookies tự động via `credentials: 'include'`.
 */

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((callback) => callback(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Gọi API refresh token
 */
export async function refreshAuthSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (res.ok) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Wrapper xung quanh window.fetch để tự động bắt lỗi 401, làm mới token và retry đúng 1 lần
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: 'include', // Bắt buộc để gửi HttpOnly Cookies
  };

  const response = await fetch(input, options);

  // Nếu không phải lỗi 401 hoặc request đến chính endpoint refresh/login/register thì trả về luôn
  const urlString = input.toString();
  if (
    response.status !== 401 ||
    urlString.includes('/api/auth/refresh') ||
    urlString.includes('/api/auth/login') ||
    urlString.includes('/api/auth/register')
  ) {
    return response;
  }

  // Đang có một request khác thực hiện refresh -> Chờ kết quả và retry
  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber(async (success) => {
        if (success) {
          resolve(await fetch(input, options));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Bắt đầu quá trình refresh
  isRefreshing = true;
  const refreshed = await refreshAuthSession();
  isRefreshing = false;
  onRefreshed(refreshed);

  if (refreshed) {
    // Retry request ban đầu đúng 1 lần
    return fetch(input, options);
  }

  return response;
}

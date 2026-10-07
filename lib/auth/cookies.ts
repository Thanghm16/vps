import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from './tokens';

export const COOKIE_ACCESS_TOKEN = 'access_token';
export const COOKIE_REFRESH_TOKEN = 'refresh_token';

const isProduction = process.env.NODE_ENV === 'production';

export const cookieOptionsBase = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Gán cặp HttpOnly Cookies (access_token và refresh_token) vào response
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  response.cookies.set({
    name: COOKIE_ACCESS_TOKEN,
    value: accessToken,
    maxAge: ACCESS_TOKEN_MAX_AGE,
    ...cookieOptionsBase,
  });

  response.cookies.set({
    name: COOKIE_REFRESH_TOKEN,
    value: refreshToken,
    maxAge: REFRESH_TOKEN_MAX_AGE,
    ...cookieOptionsBase,
  });

  return response;
}

/**
 * Xóa sạch cặp cookie xác thực (khi logout hoặc phát hiện token reuse)
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set({
    name: COOKIE_ACCESS_TOKEN,
    value: '',
    maxAge: 0,
    ...cookieOptionsBase,
  });

  response.cookies.set({
    name: COOKIE_REFRESH_TOKEN,
    value: '',
    maxAge: 0,
    ...cookieOptionsBase,
  });

  return response;
}

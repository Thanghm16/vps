'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSettings } from '@/components/settings/SettingsProvider';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginButtonProps {
  mode?: 'login' | 'register';
  customText?: string;
  className?: string;
}

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleLoginButton({
  mode = 'login',
  customText,
  className = '',
}: GoogleLoginButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get('redirect') || '/';
  const { refreshUser } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const hiddenBtnRef = useRef<HTMLDivElement>(null);

  // Lấy Google Client ID từ Admin Settings trong Database (hoặc fallback env)
  const clientId =
    settings?.googleAuth?.clientId?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    '';
  const isEnabled = settings?.googleAuth?.enabled ?? Boolean(clientId);

  const defaultText =
    mode === 'register' ? 'Đăng ký nhanh bằng Google' : 'Đăng nhập bằng Google';
  const label = customText || defaultText;

  // Xử lý phản hồi Token trực tiếp từ Google GIS Popup
  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        message.success(data.message || 'Đăng nhập bằng Google thành công!');
        if (refreshUser) {
          await refreshUser();
        }
        router.push(redirectPath);
      } else {
        message.error(data?.message || 'Đăng nhập Google thất bại.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ trong quá trình xác thực Google.');
    } finally {
      setLoading(false);
    }
  };

  // Tải và khởi tạo Google Identity Services SDK khi có clientId và isEnabled
  useEffect(() => {
    if (!clientId || !isEnabled) return;

    const scriptId = 'google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render hidden button để kích hoạt popup chuẩn Google
          if (hiddenBtnRef.current) {
            window.google.accounts.id.renderButton(hiddenBtnRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
            });
          }
        } catch (initErr) {
          console.warn('[Google GIS Init Warning]:', initErr);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGsi();
    }
  }, [clientId, isEnabled]);

  const handleClick = () => {
    if (!clientId || !isEnabled) {
      message.warning('Tính năng Đăng nhập Google đang tắt hoặc chưa cấu hình Google Client ID trong Cài đặt Admin.');
      return;
    }

    // Nếu SDK đã sẵn sàng, kích hoạt popup đăng nhập Google
    if (hiddenBtnRef.current) {
      const googleBtn = hiddenBtnRef.current.querySelector('div[role="button"]') as HTMLElement | null;
      if (googleBtn) {
        googleBtn.click();
        return;
      }
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    // Fallback sang chuyển hướng URL nếu SDK chưa kịp tải
    setLoading(true);
    const targetUrl = `/api/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
    window.location.href = targetUrl;
  };

  return (
    <>
      {/* Hidden native Google button used to trigger standard popup */}
      <div ref={hiddenBtnRef} className="hidden" aria-hidden="true" />

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full h-12 relative flex items-center justify-center gap-3 px-4 rounded-xl font-semibold text-sm text-white/90 bg-[#1e0a20]/90 hover:bg-[#2c0f2f] active:bg-[#19061b] border border-rose-900/40 hover:border-rose-500/60 shadow-lg shadow-black/40 hover:shadow-rose-900/20 transition-all duration-300 group overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      >
        {/* Background glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-rose-600/10 via-pink-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {loading ? (
          <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
        ) : (
          <div className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110 duration-200">
            <GoogleIcon className="w-5 h-5" />
          </div>
        )}

        <span className="tracking-wide relative z-10 font-medium">
          {loading ? 'Đang xử lý đăng nhập Google...' : label}
        </span>
      </button>
    </>
  );
}

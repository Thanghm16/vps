'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SafeUser } from '@/types/auth';

interface AuthContextType {
    user: SafeUser | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (credentials: { identifier: string; password: string }) => Promise<{ success: boolean; message: string }>;
    register: (data: {
        username: string;
        email: string;
        password: string;
    }) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<boolean>;
    refreshUser: () => Promise<SafeUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<SafeUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Lấy thông tin user hiện tại qua /api/auth/me
    const fetchMe = useCallback(async (): Promise<SafeUser | null> => {
        try {
            const res = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.success && data?.user) {
                    setUser(data.user);
                    return data.user;
                }
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // Làm mới session qua /api/auth/refresh
    const refreshSession = useCallback(async (): Promise<boolean> => {
        try {
            const res = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.success && data?.user) {
                    setUser(data.user);
                    return true;
                }
            }
            setUser(null);
            return false;
        } catch {
            setUser(null);
            return false;
        }
    }, []);

    // Khởi tạo kiểm tra phiên lúc mount
    useEffect(() => {
        let isMounted = true;

        async function initAuth() {
            setLoading(true);
            const currentUser = await fetchMe();
            if (!currentUser && isMounted) {
                // Nếu /api/auth/me thất bại (401), thử refresh token
                const refreshed = await refreshSession();
                if (!refreshed && isMounted) {
                    setUser(null);
                }
            }
            if (isMounted) setLoading(false);
        }

        initAuth();

        // Kiểm tra query parameter ?auth=login hoặc ?auth=register và chuyển hướng sang trang tương ứng
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const authParam = params.get('auth');
            if (authParam === 'login' || authParam === 'register' || authParam === 'forgot') {
                const targetPage = authParam === 'forgot' ? '/forgot-password' : `/${authParam}`;
                router.push(targetPage);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [fetchMe, refreshSession, router]);

    // Silent refresh ngầm mỗi 10 phút để gia hạn access token (vốn có hạn 15m)
    useEffect(() => {
        if (!user) return;

        const intervalId = setInterval(
            () => {
                refreshSession();
            },
            10 * 60 * 1000,
        ); // 10 phút

        return () => clearInterval(intervalId);
    }, [user, refreshSession]);

    // Đăng nhập
    const login = async (credentials: { identifier: string; password: string }) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
                credentials: 'include',
            });
            const data = await res.json();
            if (res.ok && data?.success) {
                setUser(data.user);
                return { success: true, message: data.message || 'Đăng nhập thành công!' };
            }
            return { success: false, message: data?.message || 'Đăng nhập thất bại.' };
        } catch {
            return { success: false, message: 'Lỗi mạng hoặc không thể kết nối tới máy chủ.' };
        }
    };

    // Đăng ký
    const register = async (inputData: { username: string; email: string; password: string }) => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inputData),
                credentials: 'include',
            });
            const data = await res.json();
            if (res.ok && data?.success) {
                setUser(data.user);
                return { success: true, message: data.message || 'Đăng ký thành công!' };
            }
            return { success: false, message: data?.message || 'Đăng ký thất bại.' };
        } catch {
            return { success: false, message: 'Lỗi mạng hoặc không thể kết nối tới máy chủ.' };
        }
    };

    // Đăng xuất
    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (err) {
            console.error('Logout request error:', err);
        } finally {
            setUser(null);
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
                router.push('/');
            }
        }
    };

    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated,
                isAdmin,
                login,
                register,
                logout,
                refreshSession,
                refreshUser: fetchMe,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

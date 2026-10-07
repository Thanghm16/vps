'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, message } from 'antd';
import { Gamepad2, Lock, User, LogIn, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';

interface LoginFormValues {
    identifier: string;
    password: string;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/';
    const oauthError = searchParams.get('error');
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm<LoginFormValues>();

    React.useEffect(() => {
        if (oauthError) {
            if (oauthError === 'account_blocked') {
                message.error('Tài khoản Google này đã bị khóa trên hệ thống.');
            } else if (oauthError === 'access_denied') {
                message.info('Bạn đã hủy đăng nhập bằng tài khoản Google.');
            } else {
                message.error('Đăng nhập bằng Google không thành công. Vui lòng thử lại.');
            }
        }
    }, [oauthError]);

    const handleFinish = async (values: LoginFormValues) => {
        setLoading(true);
        try {
            const res = await login({
                identifier: values.identifier,
                password: values.password,
            });

            if (res.success) {
                message.success(res.message || 'Đăng nhập thành công!');
                router.push(redirectPath);
            } else {
                message.error(res.message || 'Đăng nhập thất bại.');
            }
        } catch {
            message.error('Lỗi kết nối máy chủ. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* BRAND HEADER */}
            <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-xl shadow-rose-600/30 group-hover:scale-105 transition-transform duration-300">
                        <Gamepad2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1 leading-none">
                            <span className="text-white font-black text-2xl tracking-tight">Game</span>
                            <span className="text-rose-500 font-black text-2xl tracking-wider">STORE</span>
                        </div>
                        <span className="text-[10px] text-pink-300/60 font-medium tracking-widest uppercase mt-0.5">
                            Marketplace Nick VIP
                        </span>
                    </div>
                </Link>
                <h1 className="text-2xl font-black text-white tracking-wide">Đăng Nhập Tài Khoản</h1>
                <p className="text-xs text-rose-200/60 mt-1.5">
                    Chào mừng quay trở lại. Vui lòng điền thông tin xác thực để tiếp tục.
                </p>
            </div>

            {/* LOGIN CARD */}
            <div className="bg-[#120412]/90 backdrop-blur-xl border border-rose-900/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
                {/* Glow Accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    requiredMark={false}
                    className="space-y-4 relative z-10"
                >
                    <Form.Item
                        name="identifier"
                        label={<span className="text-xs text-rose-200/80 font-medium">Tên đăng nhập hoặc Email</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập hoặc email!' }]}
                    >
                        <Input
                            prefix={<User className="w-4 h-4 text-rose-400 mr-2" />}
                            placeholder="username hoặc your@email.com"
                            className="bg-[#1b061a] border-rose-900/40 hover:border-rose-500 focus:border-rose-500 text-white h-12 rounded-xl text-sm"
                        />
                    </Form.Item>

                    <div>
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                            <span className="text-xs text-rose-200/80 font-medium">Mật khẩu</span>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors hover:underline"
                            >
                                Quên mật khẩu?
                            </Link>
                        </div>
                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                            className="!mb-0"
                        >
                            <Input.Password
                                prefix={<Lock className="w-4 h-4 text-rose-400 mr-2" />}
                                placeholder="••••••••"
                                className="bg-[#1b061a] border-rose-900/40 hover:border-rose-500 focus:border-rose-500 text-white h-12 rounded-xl text-sm"
                            />
                        </Form.Item>
                    </div>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<LogIn className="w-4 h-4" />}
                        className="w-full h-12 bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-500 hover:to-pink-600 border-none font-bold text-sm rounded-xl shadow-lg shadow-rose-900/50 mt-2"
                    >
                        Đăng Nhập
                    </Button>
                </Form>

                {/* DIVIDER */}
                <div className="relative my-5 flex items-center justify-center">
                    <div className="w-full border-t border-rose-900/40" />
                    <span className="bg-[#120412] px-3 text-[11px] text-rose-200/50 uppercase tracking-widest font-medium shrink-0">
                        Hoặc tiếp tục với
                    </span>
                    <div className="w-full border-t border-rose-900/40" />
                </div>

                {/* GOOGLE SIGN IN BUTTON */}
                <GoogleLoginButton mode="login" />
            </div>

            {/* FOOTER SWITCH TO REGISTER */}
            <div className="text-center mt-6">
                <p className="text-xs text-rose-200/70">
                    Chưa có tài khoản GameStore?{' '}
                    <Link
                        href={`/register${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                        className="text-rose-400 hover:text-rose-300 font-bold hover:underline inline-flex items-center gap-1"
                    >
                        <span>Tạo tài khoản ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#090209] flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Background Decorative Gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Top back link */}
            <div className="absolute top-6 left-6 z-20">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs text-rose-200/70 hover:text-white px-3.5 py-2 rounded-full bg-white/5 border border-white/10 hover:border-rose-500/30 transition-all"
                >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Về trang chủ</span>
                </Link>
            </div>

            <Suspense fallback={<div className="text-rose-400 text-sm animate-pulse">Đang tải trang đăng nhập...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}

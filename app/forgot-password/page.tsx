'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Form, Input, Button, message } from 'antd';
import {
  Gamepad2,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface ForgotFormValues {
  email: string;
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [form] = Form.useForm<ForgotFormValues>();

  const handleFinish = async (values: ForgotFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccess(true);
        if (data.resetUrl) {
          setDevResetUrl(data.resetUrl);
        }
        message.success(data.message);
      } else {
        message.error(data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-black text-white tracking-wide">Khôi Phục Mật Khẩu</h1>
          <p className="text-xs text-rose-200/60 mt-1.5">
            Nhập email tài khoản của bạn để nhận liên kết xác thực đặt lại mật khẩu mới.
          </p>
        </div>

        {/* FORGOT CARD */}
        <div className="bg-[#120412]/90 backdrop-blur-xl border border-rose-900/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
          {/* Glow Accent */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Yêu Cầu Đã Được Tiếp Nhận</h3>
                <p className="text-xs text-rose-200/70 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Nếu địa chỉ email trùng khớp với thông tin trên hệ thống, hướng dẫn đặt lại mật khẩu đã được tạo.
                </p>
              </div>

              {devResetUrl && (
                <div className="p-3.5 bg-[#1d081c] border border-rose-900/50 rounded-xl text-left">
                  <p className="text-[11px] font-semibold text-rose-300 mb-1">Môi trường Dev - Liên kết thử nghiệm:</p>
                  <Link
                    href={devResetUrl}
                    className="text-xs text-pink-400 hover:underline break-all block"
                  >
                    {devResetUrl}
                  </Link>
                </div>
              )}

              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full h-11 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-rose-900/40"
              >
                Quay Lại Đăng Nhập
              </Link>
            </div>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFinish}
              requiredMark={false}
              className="space-y-4 relative z-10"
            >
              <Form.Item
                name="email"
                label={<span className="text-xs text-rose-200/80 font-medium">Địa chỉ Email đăng ký</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Định dạng email không hợp lệ!' },
                ]}
              >
                <Input
                  prefix={<Mail className="w-4 h-4 text-rose-400 mr-2" />}
                  placeholder="your@email.com"
                  className="bg-[#1b061a] border-rose-900/40 hover:border-rose-500 focus:border-rose-500 text-white h-12 rounded-xl text-sm"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<KeyRound className="w-4 h-4" />}
                className="w-full h-12 bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-500 hover:to-pink-600 border-none font-bold text-sm rounded-xl shadow-lg shadow-rose-900/50 mt-2"
              >
                Gửi Liên Kết Khôi Phục
              </Button>
            </Form>
          )}

          {/* SECURITY BADGE */}
          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-rose-200/50">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Liên kết khôi phục chỉ có hiệu lực trong 15 phút</span>
          </div>
        </div>

        {/* FOOTER SWITCH TO LOGIN */}
        {!success && (
          <div className="text-center mt-6">
            <p className="text-xs text-rose-200/70">
              Nhớ lại mật khẩu?{' '}
              <Link
                href="/login"
                className="text-rose-400 hover:text-rose-300 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Quay lại đăng nhập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

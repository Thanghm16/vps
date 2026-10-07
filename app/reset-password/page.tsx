'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Form, Input, Button, message } from 'antd';
import { Lock, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword?: string;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form] = Form.useForm<ResetPasswordFormValues>();

  const handleFinish = async (values: ResetPasswordFormValues) => {
    if (!token) {
      message.error('Mã xác thực khôi phục mật khẩu không tồn tại!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccess(true);
        message.success(data.message);
      } else {
        message.error(data?.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="p-8 text-center bg-[#130513] border border-rose-950/60 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-700/40 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Liên Kết Không Hợp Lệ</h1>
        <p className="text-sm text-rose-200/60 mb-6">
          Không tìm thấy mã xác thực khôi phục mật khẩu. Vui lòng kiểm tra lại liên kết trong email của bạn.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Về Trang Chủ
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8 text-center bg-[#130513] border border-emerald-950/60 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Đổi Mật Khẩu Thành Công</h1>
        <p className="text-sm text-rose-200/60 mb-6">
          Mật khẩu của bạn đã được cập nhật thành công. Toàn bộ phiên đăng nhập cũ đã được đăng xuất an toàn.
        </p>
        <Link
          href="/?auth=login"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Đăng Nhập Ngay
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#130513] border border-rose-900/30 rounded-2xl max-w-md w-full shadow-2xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-700 via-rose-600 to-pink-500 mb-3 shadow-lg shadow-rose-900/40">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Đặt Lại Mật Khẩu</h1>
        <p className="text-xs text-rose-200/60 mt-1">
          Nhập mật khẩu mới cho tài khoản của bạn (tối thiểu 8 ký tự).
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
        className="space-y-4"
      >
        <Form.Item
          name="password"
          label={<span className="text-xs text-rose-200/80 font-medium">Mật khẩu mới</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
            { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự!' },
          ]}
        >
          <Input.Password
            prefix={<Lock className="w-4 h-4 text-rose-400 mr-1.5" />}
            placeholder="••••••••"
            className="bg-[#1b061a] border-rose-900/40 hover:border-rose-500 focus:border-rose-500 text-white h-11 rounded-lg"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={<span className="text-xs text-rose-200/80 font-medium">Xác nhận mật khẩu mới</span>}
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<Lock className="w-4 h-4 text-rose-400 mr-1.5" />}
            placeholder="••••••••"
            className="bg-[#1b061a] border-rose-900/40 hover:border-rose-500 focus:border-rose-500 text-white h-11 rounded-lg"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={<ArrowRight className="w-4 h-4" />}
          className="w-full h-11 bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-500 hover:to-pink-600 border-none font-semibold text-sm rounded-lg shadow-lg shadow-rose-900/50 mt-2"
        >
          Cập Nhật Mật Khẩu
        </Button>
      </Form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0a020a] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-rose-300 text-sm animate-pulse">
            Đang tải dữ liệu xác thực...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChangePasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword?: string;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ChangePasswordFormValues>();

  const handleFinish = async (values: ChangePasswordFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        message.success(data.message || 'Đổi mật khẩu thành công!');
        form.resetFields();
        onClose();
      } else {
        message.error(data?.message || 'Đổi mật khẩu thất bại.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={440}
      destroyOnClose
      styles={{
        body: {
          backgroundColor: '#120412',
          borderRadius: '16px',
          padding: '12px 4px',
          color: '#ffffff',
        },
        mask: {
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(5, 1, 6, 0.75)',
        },
      }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-700 via-rose-600 to-pink-500 mb-3 shadow-lg shadow-rose-900/40">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white">Đổi Mật Khẩu</h2>
        <p className="text-xs text-rose-200/60 mt-1">
          Cập nhật mật khẩu mới và đăng xuất khỏi các thiết bị khác.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
        className="space-y-3"
      >
        <Form.Item
          name="oldPassword"
          label={<span className="text-xs text-rose-200/80 font-medium">Mật khẩu hiện tại</span>}
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
        >
          <Input.Password
            prefix={<Lock className="w-4 h-4 text-rose-400 mr-1.5" />}
            placeholder="••••••••"
            className="bg-[#1b061a] border-rose-900/40 hover:border-rose-500 focus:border-rose-500 text-white h-11 rounded-lg"
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={<span className="text-xs text-rose-200/80 font-medium">Mật khẩu mới (tối thiểu 8 ký tự)</span>}
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
          name="confirmNewPassword"
          label={<span className="text-xs text-rose-200/80 font-medium">Xác nhận mật khẩu mới</span>}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
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

        <div className="flex gap-2 pt-2">
          <Button
            type="default"
            onClick={onClose}
            className="w-1/3 h-11 bg-[#1b061a] border-rose-900/40 text-rose-200 hover:text-white rounded-lg text-xs"
          >
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-2/3 h-11 bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-500 hover:to-pink-600 border-none font-semibold text-xs rounded-lg shadow-lg shadow-rose-900/50"
          >
            Lưu Mật Khẩu
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

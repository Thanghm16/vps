'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import {
  Store,
  CreditCard,
  ShieldCheck,
  Save,
  QrCode,
  Cloud,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Zap,
  Building2,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  HelpCircle,
  Layers,
  Globe,
  Image as ImageIcon,
  Search,
  PhoneCall,
  Share2,
  Megaphone,
  Wrench,
  Upload,
  X,
  Sparkles,
  ExternalLink,
  Bot,
  Send,
  Bell,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Switch,
  App,
  Alert,
  Modal,
  Select,
  Tag,
  Tooltip,
} from 'antd';
import { S3StorageConfig } from '@/types/admin';
import { SEPAY_SUPPORTED_BANKS, BankAccountConfig } from '@/types/bank';
import { ImageAsset } from '@/types/settings';
import Image from 'next/image';
import { GoogleIcon } from '@/components/auth/GoogleLoginButton';

export default function AdminSettingsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [bankModalForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Logo, Favicon, OG Image states
  const [logoState, setLogoState] = useState<ImageAsset | null>(null);
  const [faviconState, setFaviconState] = useState<ImageAsset | null>(null);
  const [ogImageState, setOgImageState] = useState<ImageAsset | null>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingOgImage, setIsUploadingOgImage] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const ogImageInputRef = useRef<HTMLInputElement | null>(null);

  // Bank management modal states
  const [bankAccounts, setBankAccounts] = useState<BankAccountConfig[]>([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // S3 test states
  const [isTestingS3, setIsTestingS3] = useState(false);
  const [s3TestStatus, setS3TestStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Telegram test states
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // 1. Tải cấu hình từ MongoDB
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        form.setFieldsValue({
          ...s,
          keywords: s.seo?.keywords ? s.seo.keywords : [],
          telegram: s.telegram || {},
          googleAuth: s.googleAuth || { enabled: false, clientId: '', clientSecret: '' },
          payment: {
            ...s.payment,
            sepayActive: s.payment?.sepayActive !== undefined ? Boolean(s.payment.sepayActive) : true,
          },
          announcement: {
            ...s.announcement,
            enabled: s.announcement?.enabled !== undefined ? Boolean(s.announcement.enabled) : true,
          },
        });

        // Set Image assets states
        setLogoState(s.logo || null);
        setFaviconState(s.favicon || null);
        setOgImageState(s.seo?.ogImage || null);

        if (Array.isArray(s.payment?.bankAccounts)) {
          setBankAccounts(s.payment.bankAccounts);
        }
      } else {
        message.error(data.message || 'Không thể tải cấu hình hệ thống.');
      }
    } catch {
      message.error('Lỗi kết nối khi tải thiết lập hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [form, message]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Upload helper for Logo / Favicon / OG Image
  const handleUploadAsset = async (
    file: File,
    type: 'logo' | 'favicon' | 'ogImage'
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'branding');

    try {
      if (type === 'logo') setIsUploadingLogo(true);
      if (type === 'favicon') setIsUploadingFavicon(true);
      if (type === 'ogImage') setIsUploadingOgImage(true);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        const asset: ImageAsset = {
          url: data.url,
          key: data.key,
          size: data.size,
          alt: file.name,
        };

        if (type === 'logo') {
          setLogoState(asset);
          form.setFieldValue('logo', asset);
        } else if (type === 'favicon') {
          setFaviconState(asset);
          form.setFieldValue('favicon', asset);
        } else if (type === 'ogImage') {
          setOgImageState(asset);
          form.setFieldValue(['seo', 'ogImage'], asset);
        }

        message.success(`Đã tải ảnh ${type} lên Cloudfly S3 thành công!`);
      } else {
        message.error(data.message || 'Lỗi khi tải ảnh lên.');
      }
    } catch {
      message.error('Lỗi mạng khi tải ảnh.');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      if (type === 'favicon') setIsUploadingFavicon(false);
      if (type === 'ogImage') setIsUploadingOgImage(false);
    }
  };

  // 2. Lưu cấu hình vào MongoDB
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      const payload = {
        ...values,
        logo: logoState,
        favicon: faviconState,
        seo: {
          ...values.seo,
          keywords: Array.isArray(values.keywords)
            ? values.keywords
            : typeof values.keywords === 'string'
            ? values.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
            : values.seo?.keywords || [],
          ogImage: ogImageState,
        },
        payment: {
          ...values.payment,
          bankAccounts: bankAccounts,
        },
        telegram: {
          ...values.telegram,
        },
        googleAuth: {
          ...values.googleAuth,
        },
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        message.success(data.message || 'Đã lưu thiết lập vào MongoDB thành công!');
        if (data.settings) {
          form.setFieldsValue({
            ...data.settings,
            keywords: data.settings.seo?.keywords || [],
            telegram: data.settings.telegram || {},
            googleAuth: data.settings.googleAuth || { enabled: false, clientId: '', clientSecret: '' },
            payment: {
              ...data.settings.payment,
              sepayActive: data.settings.payment?.sepayActive !== undefined ? Boolean(data.settings.payment.sepayActive) : true,
            },
            announcement: {
              ...data.settings.announcement,
              enabled: data.settings.announcement?.enabled !== undefined ? Boolean(data.settings.announcement.enabled) : true,
            },
          });
          setLogoState(data.settings.logo || null);
          setFaviconState(data.settings.favicon || null);
          setOgImageState(data.settings.seo?.ogImage || null);
          if (Array.isArray(data.settings.payment?.bankAccounts)) {
            setBankAccounts(data.settings.payment.bankAccounts);
          }
        }
      } else {
        message.error(data.message || 'Lưu thiết lập thất bại.');
      }
    } catch {
      message.error('Vui lòng kiểm tra lại các trường thông tin trong biểu mẫu.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Kiểm tra kết nối S3 Cloudfly trực tiếp
  const handleTestS3 = async () => {
    try {
      setIsTestingS3(true);
      setS3TestStatus({ type: null, message: '' });

      const s3Values = form.getFieldValue('s3') as S3StorageConfig | undefined;

      const res = await fetch('/api/admin/settings/test-s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s3Values || {}),
      });

      const data = await res.json();
      if (data.success) {
        setS3TestStatus({ type: 'success', message: data.message });
        message.success(data.message);
      } else {
        setS3TestStatus({ type: 'error', message: data.message });
        message.error(data.message);
      }
    } catch (err) {
      const msg = 'Không thể kết nối đến Cloudfly S3: ' + (err as Error).message;
      setS3TestStatus({ type: 'error', message: msg });
      message.error(msg);
    } finally {
      setIsTestingS3(false);
    }
  };

  // 4. Kiểm tra kết nối Telegram Bot trực tiếp
  const handleTestTelegram = async () => {
    try {
      setIsTestingTelegram(true);
      setTelegramTestStatus({ type: null, message: '' });

      const telegramValues = form.getFieldValue('telegram') || {};
      const siteName = form.getFieldValue('siteName') || form.getFieldValue('brandName');

      const res = await fetch('/api/admin/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...telegramValues,
          siteName: siteName || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTelegramTestStatus({ type: 'success', message: data.message });
        message.success(data.message);
      } else {
        setTelegramTestStatus({ type: 'error', message: data.message });
        message.error(data.message);
      }
    } catch (err) {
      const msg = 'Không thể kết nối đến Telegram API: ' + (err as Error).message;
      setTelegramTestStatus({ type: 'error', message: msg });
      message.error(msg);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // 4. Đổi mật khẩu Admin
  const handleChangePassword = async (values: {
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu mới và mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        message.success(data.message || 'Đổi mật khẩu quản trị thành công!');
        passwordForm.resetFields();
      } else {
        message.error(data.message || 'Đổi mật khẩu thất bại.');
      }
    } catch {
      message.error('Vui lòng kiểm tra lại các trường mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Helper to persist bank changes immediately
  const persistBankAccounts = async (updatedList: BankAccountConfig[], successMsg: string) => {
    try {
      const currentValues = form.getFieldsValue();
      const payload = {
        ...currentValues,
        logo: logoState,
        favicon: faviconState,
        seo: {
          ...currentValues.seo,
          ogImage: ogImageState,
        },
        payment: {
          ...currentValues.payment,
          bankAccounts: updatedList,
        },
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        message.success(successMsg);
      } else {
        message.warning('Đã cập nhật giao diện, vui lòng bấm "Lưu Tất Cả Thiết Lập" để xác nhận.');
      }
    } catch {
      message.warning('Đã cập nhật giao diện, vui lòng bấm "Lưu Tất Cả Thiết Lập" để xác nhận.');
    }
  };

  // Bank Modal Handlers
  const handleOpenAddBank = () => {
    setEditingBankIndex(null);
    bankModalForm.resetFields();
    bankModalForm.setFieldsValue({
      bankCode: 'MBBank',
      vaMode: 'all',
      useMainAccount: true,
      active: true,
      isDefault: bankAccounts.length === 0,
      virtualAccounts: [],
    });
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = (index: number) => {
    setEditingBankIndex(index);
    const bank = bankAccounts[index];
    bankModalForm.setFieldsValue({
      ...bank,
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBankModal = () => {
    bankModalForm.validateFields().then(async (vals) => {
      const selectedBankMeta = SEPAY_SUPPORTED_BANKS.find((b) => b.code === vals.bankCode);
      const newBank: BankAccountConfig = {
        id: editingBankIndex !== null ? bankAccounts[editingBankIndex].id : `bank-${Date.now()}`,
        bankCode: vals.bankCode,
        bankName: selectedBankMeta?.name || vals.bankCode,
        accountNumber: vals.accountNumber.trim(),
        accountHolder: vals.accountHolder.trim().toUpperCase(),
        branch: (vals.branch || '').trim(),
        isDefault: Boolean(vals.isDefault),
        active: vals.active !== undefined ? Boolean(vals.active) : true,
        vaMode: vals.vaMode || 'all',
        useMainAccount: selectedBankMeta?.isVAMandatory ? false : Boolean(vals.useMainAccount),
        virtualAccounts: Array.isArray(vals.virtualAccounts) ? vals.virtualAccounts : [],
      };

      let updatedList = [...bankAccounts];
      if (newBank.isDefault) {
        updatedList = updatedList.map((b) => ({ ...b, isDefault: false }));
      }

      if (editingBankIndex !== null) {
        updatedList[editingBankIndex] = newBank;
      } else {
        updatedList.push(newBank);
      }

      setBankAccounts(updatedList);
      setIsBankModalOpen(false);
      await persistBankAccounts(updatedList, 'Đã lưu tài khoản ngân hàng vào Database thành công!');
    });
  };

  const handleDeleteBank = async (index: number) => {
    const updated = bankAccounts.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((b) => b.isDefault)) {
      updated[0].isDefault = true;
    }
    setBankAccounts(updated);
    await persistBankAccounts(updated, 'Đã xóa tài khoản ngân hàng thành công!');
  };

  const handleSetDefaultBank = async (index: number) => {
    const updated = bankAccounts.map((b, i) => ({
      ...b,
      isDefault: i === index,
    }));
    setBankAccounts(updated);
    await persistBankAccounts(
      updated,
      `Đã đặt ${bankAccounts[index].bankCode} làm tài khoản mặc định VietQR!`
    );
  };

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/sepay`
      : 'https://your-domain.com/api/webhooks/sepay';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    message.success('Đã sao chép URL Webhook SePay!');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // ==========================================
  // TAB 1: THÔNG TIN CHUNG (General)
  // ==========================================
  const generalTab = (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Store className="w-4 h-4 text-rose-400" />
          <span>Thông Tin Nhận Diện Website</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="siteName"
            label={<span className="text-xs font-semibold text-pink-200">Tên Website (Site Name)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên website' }]}
            extra={<span className="text-[11px] text-pink-300/40">Tên đầy đủ hiển thị trên tiêu đề tab trình duyệt</span>}
          >
            <Input placeholder="GameStore VN - Sàn Mua Bán Nick Game Tự Động" />
          </Form.Item>

          <Form.Item
            name="brandName"
            label={<span className="text-xs font-semibold text-pink-200">Tên Thương Hiệu (Brand Name)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên thương hiệu' }]}
            extra={<span className="text-[11px] text-pink-300/40">Tên ngắn hiển thị trên Header / Footer</span>}
          >
            <Input placeholder="Game STORE" />
          </Form.Item>
        </div>

        <Form.Item
          name="siteDescription"
          label={<span className="text-xs font-semibold text-pink-200">Mô Tả Tổng Quan Website</span>}
          extra={<span className="text-[11px] text-pink-300/40">Giới thiệu ngắn về dịch vụ và ưu điểm nổi bật của shop</span>}
        >
          <Input.TextArea rows={3} placeholder="Sàn thương mại điện tử chuyên mua bán tài khoản, nick game..." />
        </Form.Item>

        <Form.Item
          name="siteUrl"
          label={<span className="text-xs font-semibold text-pink-200">Địa Chỉ URL Website (Site URL)</span>}
          extra={<span className="text-[11px] text-pink-300/40">Ví dụ: https://gamestore.vn (Dùng cho SEO, Canonical, OG Tags)</span>}
        >
          <Input placeholder="https://gamestore.vn" />
        </Form.Item>
      </div>

      {/* CHÍNH SÁCH VẬN HÀNH BÁN HÀNG */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Chính Sách Bán Hàng & Nạp Ví</span>
        </h4>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/5">
          <div>
            <div className="text-xs font-bold text-white">Chế Độ Bàn Giao Nick Tự Động 24/7</div>
            <div className="text-[11px] text-pink-300/50 mt-0.5">
              Tự động gửi tài khoản và mật khẩu sau khi nhận tiền từ cổng thanh toán
            </div>
          </div>
          <Form.Item name="autoDelivery" valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Form.Item
            name="defaultWarrantyDays"
            label={<span className="text-xs font-semibold text-pink-200">Thời Gian Bảo Hành Mặc Định (Ngày)</span>}
          >
            <InputNumber min={1} max={365} style={{ width: '100%' }} className="w-full" />
          </Form.Item>

          <Form.Item
            name="minDepositAmount"
            label={<span className="text-xs font-semibold text-pink-200">Mức Nạp Ví Tối Thiểu (VNĐ)</span>}
          >
            <InputNumber min={10000} step={10000} style={{ width: '100%' }} className="w-full" />
          </Form.Item>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 2: THƯƠNG HIỆU (Logo & Favicon)
  // ==========================================
  const brandingTab = (
    <div className="space-y-6 max-w-3xl">
      {/* LOGO UPLOAD & PREVIEW */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-rose-400" />
            <span>Logo Website</span>
          </h4>
          <span className="text-[11px] text-pink-300/50">Khuyên dùng: PNG trong suốt hoặc SVG, tỷ lệ 4:1</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo Preview Box */}
          <div className="w-48 h-20 rounded-2xl bg-black/60 border border-dashed border-white/15 flex items-center justify-center p-3 relative overflow-hidden group">
            {logoState?.url ? (
              <>
                <Image
                  src={logoState.url}
                  alt="Logo Preview"
                  width={160}
                  height={50}
                  className="object-contain max-h-full max-w-full"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoState(null);
                    form.setFieldValue('logo', undefined);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  title="Xóa logo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-xs text-pink-300/40 text-center">Chưa có Logo</span>
            )}
          </div>

          {/* Upload Button & URL Input */}
          <div className="flex-1 space-y-3 w-full">
            <input
              type="file"
              ref={logoInputRef}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadAsset(file, 'logo');
              }}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploadingLogo ? 'Đang tải lên S3...' : 'Tải Lên Logo Mới'}</span>
              </button>

              {logoState?.url && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoState(null);
                    form.setFieldValue('logo', undefined);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Xóa Logo
                </button>
              )}
            </div>

            <Input
              placeholder="Hoặc nhập URL trực tiếp: https://..."
              value={logoState?.url || ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                const asset = val ? { url: val, alt: 'Logo' } : null;
                setLogoState(asset);
                form.setFieldValue('logo', asset || undefined);
              }}
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* FAVICON UPLOAD & PREVIEW */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Favicon Trình Duyệt</span>
          </h4>
          <span className="text-[11px] text-pink-300/50">Khuyên dùng: ICO, PNG 32x32 hoặc 64x64</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Favicon Preview Box */}
          <div className="w-16 h-16 rounded-2xl bg-black/60 border border-dashed border-white/15 flex items-center justify-center p-2 relative overflow-hidden group">
            {faviconState?.url ? (
              <>
                <Image
                  src={faviconState.url}
                  alt="Favicon Preview"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFaviconState(null);
                    form.setFieldValue('favicon', undefined);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  title="Xóa favicon"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <span className="text-[10px] text-pink-300/40 text-center">Favicon</span>
            )}
          </div>

          {/* Upload Button & URL Input */}
          <div className="flex-1 space-y-3 w-full">
            <input
              type="file"
              ref={faviconInputRef}
              accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadAsset(file, 'favicon');
              }}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={isUploadingFavicon}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isUploadingFavicon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploadingFavicon ? 'Đang tải lên S3...' : 'Tải Lên Favicon'}</span>
              </button>

              {faviconState?.url && (
                <button
                  type="button"
                  onClick={() => {
                    setFaviconState(null);
                    form.setFieldValue('favicon', undefined);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Xóa Favicon
                </button>
              )}
            </div>

            <Input
              placeholder="Hoặc nhập URL trực tiếp: https://..."
              value={faviconState?.url || ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                const asset = val ? { url: val, alt: 'Favicon' } : null;
                setFaviconState(asset);
                form.setFieldValue('favicon', asset || undefined);
              }}
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 3: SEO & OPEN GRAPH
  // ==========================================
  const seoTab = (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          <span>Cấu Hình Thẻ Meta SEO & Công Cụ Tìm Kiếm</span>
        </h4>

        <Form.Item
          name={['seo', 'title']}
          label={<span className="text-xs font-semibold text-pink-200">SEO Meta Title (Tiêu Đề SEO)</span>}
          extra={<span className="text-[11px] text-pink-300/40">Khuyên dùng: 50 - 60 ký tự</span>}
        >
          <Input placeholder="GameStore - Sàn Giao Dịch Mua Bán Nick Game Uy Tín #1 VN" />
        </Form.Item>

        <Form.Item
          name={['seo', 'description']}
          label={<span className="text-xs font-semibold text-pink-200">SEO Meta Description (Mô Tả SEO)</span>}
          extra={<span className="text-[11px] text-pink-300/40">Khuyên dùng: 140 - 160 ký tự</span>}
        >
          <Input.TextArea rows={3} placeholder="Sàn giao dịch tài khoản, nick game Liên Quân, Valorant, Free Fire..." />
        </Form.Item>

        <Form.Item
          name="keywords"
          label={<span className="text-xs font-semibold text-pink-200">Từ Khóa SEO (Keywords)</span>}
          extra={<span className="text-[11px] text-pink-300/40">Nhập từ khóa và nhấn Enter để thêm thẻ</span>}
        >
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="mua nick game, acc valorant, shop game..."
            tokenSeparators={[',']}
          />
        </Form.Item>

        <Form.Item
          name={['seo', 'canonicalUrl']}
          label={<span className="text-xs font-semibold text-pink-200">Canonical URL (Tùy chọn)</span>}
          extra={<span className="text-[11px] text-pink-300/40">Để trống sẽ tự động lấy theo Site URL</span>}
        >
          <Input placeholder="https://gamestore.vn" />
        </Form.Item>
      </div>

      {/* OG IMAGE UPLOAD & PREVIEW */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>Ảnh Chia Sẻ Mạng Xã Hội (Open Graph / Facebook Image)</span>
          </h4>
          <span className="text-[11px] text-pink-300/50">Khuyên dùng: 1200 x 630px</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* OG Image Preview Box */}
          <div className="w-56 h-28 rounded-2xl bg-black/60 border border-dashed border-white/15 flex items-center justify-center p-2 relative overflow-hidden group">
            {ogImageState?.url ? (
              <>
                <Image
                  src={ogImageState.url}
                  alt="OG Image Preview"
                  width={200}
                  height={100}
                  className="object-cover w-full h-full rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    setOgImageState(null);
                    form.setFieldValue(['seo', 'ogImage'], undefined);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  title="Xóa ảnh OG"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-xs text-pink-300/40 text-center">Chưa có ảnh OG (1200x630)</span>
            )}
          </div>

          {/* Upload Button & URL Input */}
          <div className="flex-1 space-y-3 w-full">
            <input
              type="file"
              ref={ogImageInputRef}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadAsset(file, 'ogImage');
              }}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => ogImageInputRef.current?.click()}
                disabled={isUploadingOgImage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isUploadingOgImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploadingOgImage ? 'Đang tải lên S3...' : 'Tải Lên Ảnh OG Mới'}</span>
              </button>

              {ogImageState?.url && (
                <button
                  type="button"
                  onClick={() => {
                    setOgImageState(null);
                    form.setFieldValue(['seo', 'ogImage'], undefined);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Xóa ảnh OG
                </button>
              )}
            </div>

            <Input
              placeholder="Hoặc nhập URL trực tiếp: https://..."
              value={ogImageState?.url || ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                const asset = val ? { url: val, alt: 'OG Image' } : null;
                setOgImageState(asset);
                form.setFieldValue(['seo', 'ogImage'], asset || undefined);
              }}
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 4: THÔNG TIN LIÊN HỆ & FOOTER
  // ==========================================
  const contactTab = (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <span>Kênh Chăm Sóc & Hỗ Trợ Khách Hàng</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name={['contact', 'phone']}
            label={<span className="text-xs font-semibold text-pink-200">Hotline CSKH</span>}
          >
            <Input placeholder="1900 8888 hoặc 0988.888.999" />
          </Form.Item>

          <Form.Item
            name={['contact', 'zalo']}
            label={<span className="text-xs font-semibold text-pink-200">Số Điện Thoại / Zalo Hỗ Trợ</span>}
          >
            <Input placeholder="0988.888.999" />
          </Form.Item>

          <Form.Item
            name={['contact', 'email']}
            label={<span className="text-xs font-semibold text-pink-200">Email Hỗ Trợ Khách Hàng</span>}
          >
            <Input placeholder="hotro@gamestore.vn" />
          </Form.Item>

          <Form.Item
            name={['contact', 'address']}
            label={<span className="text-xs font-semibold text-pink-200">Địa Chỉ Văn Phòng / Trụ Sở</span>}
          >
            <Input placeholder="Tòa Nhà Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm, Hà Nội" />
          </Form.Item>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span>Mô Tả & Bản Quyền Chân Trang (Footer)</span>
        </h4>

        <Form.Item
          name={['footer', 'description']}
          label={<span className="text-xs font-semibold text-pink-200">Đoạn Văn Giới Thiệu Chân Trang</span>}
        >
          <Input.TextArea rows={3} placeholder="Sàn thương mại điện tử chuyên cung cấp tài khoản, nick game bản quyền uy tín..." />
        </Form.Item>

        <Form.Item
          name={['footer', 'copyright']}
          label={<span className="text-xs font-semibold text-pink-200">Dòng Chữ Bản Quyền (Copyright)</span>}
        >
          <Input placeholder="© 2026 GameStore.vn — Sàn giao dịch tài khoản game tự động uy tín & an toàn nhất Việt Nam." />
        </Form.Item>
      </div>
    </div>
  );

  // ==========================================
  // TAB 5: MẠNG XÃ HỘI (Social)
  // ==========================================
  const socialTab = (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-rose-400" />
          <span>Liên Kết Các Kênh Mạng Xã Hội & Cộng Đồng</span>
        </h4>
        <p className="text-xs text-pink-300/50">
          Các biểu tượng mạng xã hội tại Footer sẽ chỉ hiển thị khi bạn điền đường link hợp lệ.
        </p>

        <div className="space-y-3">
          <Form.Item
            name={['social', 'facebook']}
            label={<span className="text-xs font-semibold text-pink-200">Trang / Nhóm Facebook</span>}
          >
            <Input placeholder="https://facebook.com/gamestore.vn" />
          </Form.Item>

          <Form.Item
            name={['social', 'youtube']}
            label={<span className="text-xs font-semibold text-pink-200">Kênh YouTube</span>}
          >
            <Input placeholder="https://youtube.com/@gamestore" />
          </Form.Item>

          <Form.Item
            name={['social', 'tiktok']}
            label={<span className="text-xs font-semibold text-pink-200">Kênh TikTok</span>}
          >
            <Input placeholder="https://tiktok.com/@gamestore" />
          </Form.Item>

          <Form.Item
            name={['social', 'telegram']}
            label={<span className="text-xs font-semibold text-pink-200">Kênh / Group Telegram</span>}
          >
            <Input placeholder="https://t.me/gamestore_official" />
          </Form.Item>

          <Form.Item
            name={['social', 'zalo']}
            label={<span className="text-xs font-semibold text-pink-200">Link Nhóm Zalo Hỗ Trợ</span>}
          >
            <Input placeholder="https://zalo.me/g/..." />
          </Form.Item>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 6: THANH THÔNG BÁO (Announcement)
  // ==========================================
  const announcementTab = (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Thanh Thông Báo Nổi Bật Đầu Trang (Top Bar)</span>
          </h4>

          <div className="flex items-center gap-2">
            <span className="text-xs text-pink-200 font-semibold">Bật hiển thị:</span>
            <Form.Item name={['announcement', 'enabled']} valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>
        </div>

        <p className="text-xs text-pink-300/50">
          Thanh banner nổi bật chạy ở vị trí cao nhất trên mọi trang web giúp truyền tải thông điệp Flash Sale hoặc sự kiện quan trọng.
        </p>

        <Form.Item
          name={['announcement', 'text']}
          label={<span className="text-xs font-semibold text-pink-200">Nội Dung Thông Báo</span>}
        >
          <Input.TextArea
            rows={2}
            placeholder="🔥 SIÊU SALE NICK VIP LIÊN QUÂN, VALORANT, FREE FIRE - BÀN GIAO TỰ ĐỘNG 24/7!"
          />
        </Form.Item>

        <Form.Item
          name={['announcement', 'link']}
          label={<span className="text-xs font-semibold text-pink-200">Liên Kết Khi Click (Tùy chọn)</span>}
        >
          <Input placeholder="/#kho-nick hoặc https://..." />
        </Form.Item>
      </div>
    </div>
  );

  // ==========================================
  // TAB 7: BẢO TRÌ HỆ THỐNG (Maintenance)
  // ==========================================
  const maintenanceTab = (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-rose-500/20 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chế Độ Bảo Trì Hệ Thống</h4>
              <p className="text-[11px] text-pink-300/50">Tạm đóng website với khách truy cập thông thường</p>
            </div>
          </div>

          <Form.Item name={['maintenance', 'enabled']} valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>

        <Alert
          type="warning"
          showIcon
          message="Lưu ý khi bật chế độ bảo trì"
          description="Khi chế độ này được bật, toàn bộ khách truy cập sẽ thấy màn hình thông báo bảo trì. Chỉ có Quản trị viên (Admin) đã đăng nhập mới có thể truy cập trang quản trị để quản lý hệ thống."
          className="rounded-xl border border-amber-500/30"
        />

        <Form.Item
          name={['maintenance', 'message']}
          label={<span className="text-xs font-semibold text-pink-200">Thông Điệp Thông Báo Cho Khách</span>}
        >
          <Input.TextArea
            rows={4}
            placeholder="Hệ thống đang được nâng cấp bảo trì định kỳ để nâng cao chất lượng dịch vụ. Vui lòng quay lại sau ít phút!"
          />
        </Form.Item>
      </div>
    </div>
  );

  // ==========================================
  // TAB 8: NGÂN HÀNG & SEPAY WEBHOOK
  // ==========================================
  const paymentTab = (
    <div className="space-y-6 max-w-4xl">
      {/* SEPAY WEBHOOK ENDPOINT BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-[#1c081a]/60 border border-emerald-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Webhook SePay Đối Soát Tự Động 24/7</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HTTP 200 Idempotent
                </span>
              </div>
              <p className="text-xs text-pink-300/60 mt-0.5">
                Nhận tín hiệu biến động số dư chuyển khoản từ SePay, tự động cộng tiền và bàn giao nick ngay lập tức.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-pink-200 font-semibold">Kích hoạt:</span>
            <Form.Item name={['payment', 'sepayActive']} valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>
        </div>

        {/* WEBHOOK URL COPY BOX */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="truncate w-full sm:w-auto">
            <span className="text-[11px] text-pink-300/50 block">URL Webhook nhận dữ liệu (Dán vào my.sepay.vn):</span>
            <span className="font-mono text-xs text-emerald-400 font-bold select-all">{webhookUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shrink-0"
          >
            {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWebhook ? 'Đã sao chép' : 'Sao Chép URL'}</span>
          </button>
        </div>

        {/* API KEY CONFIGURATION */}
        <div className="pt-2 max-w-lg">
          <Form.Item
            name={['payment', 'sepayApiKey']}
            label={<span className="text-xs font-semibold text-pink-200">SePay API Key / Token (Tùy chọn)</span>}
            extra={<span className="text-[10px] text-pink-300/40">Dùng để xác thực header Apikey gửi từ SePay sang server</span>}
          >
            <Input.Password placeholder="sp_live_xxxx" className="font-mono text-xs" />
          </Form.Item>
        </div>
      </div>

      {/* BANK ACCOUNTS LIST & VA SETTINGS */}
      <div className="p-5 rounded-3xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-rose-400" />
              <span>Tài Khoản Ngân Hàng & Virtual Account (VA)</span>
            </h4>
            <p className="text-xs text-pink-300/50 mt-0.5">
              Cấu hình các tài khoản ngân hàng liên kết với SePay, chế độ VA chính thức & VA nội dung (TKP)
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddBank}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Tài Khoản Ngân Hàng</span>
          </button>
        </div>

        {/* BANK CARDS */}
        {bankAccounts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-black/30 border border-dashed border-white/10 text-xs text-pink-300/40">
            Chưa có tài khoản ngân hàng nào. Bấm &quot;Thêm Tài Khoản Ngân Hàng&quot; để tạo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((bank, index) => {
              const meta = SEPAY_SUPPORTED_BANKS.find((b) => b.code === bank.bankCode);
              return (
                <div
                  key={bank.id || index}
                  className={`p-4 rounded-2xl border transition relative space-y-3 ${
                    bank.isDefault
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30'
                      : 'bg-black/40 border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{bank.bankCode}</span>
                        {bank.isDefault && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Mặc định VietQR
                          </span>
                        )}
                        {!bank.active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-400">
                            Tạm ngưng
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-pink-300/60 font-mono mt-0.5">
                        STK: <strong className="text-white">{bank.accountNumber}</strong>
                      </div>
                      <div className="text-[11px] text-pink-300/50 uppercase">
                        Chủ TK: {bank.accountHolder}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBank(index)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-200 transition cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(index)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-pink-200 hover:text-red-300 transition cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* VA CONFIG SUMMARY */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-pink-300/60">
                      <span>Chế độ nhận diện:</span>
                      <span className="font-bold text-white">
                        {bank.vaMode === 'all' ? 'Tất cả tài khoản' : 'Chọn cụ thể'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-pink-300/60">
                      <span>Nhận từ TK chính:</span>
                      <span className={bank.useMainAccount ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {meta?.isVAMandatory ? 'Khóa (Bắt buộc qua VA)' : bank.useMainAccount ? 'Đang bật' : 'Tắt'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-pink-300/60">
                      <span>Số lượng VA / TKP:</span>
                      <span className="font-mono text-rose-300 font-bold">
                        {bank.virtualAccounts?.length || 0} mã
                      </span>
                    </div>
                  </div>

                  {/* SET DEFAULT ACTION */}
                  {!bank.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultBank(index)}
                      className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white text-xs font-medium border border-white/5 transition cursor-pointer"
                    >
                      Đặt làm ngân hàng mặc định cho VietQR
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEPAY SUPPORTED BANKS REFERENCE TABLE */}
      <div className="p-5 rounded-3xl bg-[#1c081a]/60 border border-white/5 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/5">
          <HelpCircle className="w-4 h-4 text-rose-400" />
          <span>Danh Sách Ngân Hàng Hỗ Trợ Webhook SePay (Tài Liệu Kỹ Thuật)</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-pink-300/60">
                <th className="py-2 px-3 font-semibold">Ngân Hàng</th>
                <th className="py-2 px-3 font-semibold">VA Chính Thức</th>
                <th className="py-2 px-3 font-semibold">Tiền Vào</th>
                <th className="py-2 px-3 font-semibold">Tiền Ra</th>
                <th className="py-2 px-3 font-semibold">Ghi Chú Triển Khai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {SEPAY_SUPPORTED_BANKS.map((b) => (
                <tr key={b.code} className="hover:bg-white/5 transition">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="font-mono text-rose-400">{b.code}</span>
                    <span className="text-[11px] text-pink-300/50 font-normal truncate max-w-[120px]">{b.shortName}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {b.isVAMandatory ? (
                      <Tag color="error">Bắt buộc</Tag>
                    ) : b.hasOfficialVA ? (
                      <Tag color="success">Có</Tag>
                    ) : (
                      <Tag color="default">Dùng TKP</Tag>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <Tag color="success">Có</Tag>
                  </td>
                  <td className="py-2.5 px-3">
                    {b.supportsOut ? <Tag color="processing">Có</Tag> : <Tag color="default">Không</Tag>}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-pink-300/60">
                    {b.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 9: CẤU HÌNH S3 CLOUDFLY
  // ==========================================
  const s3Tab = (
    <div className="space-y-5 max-w-4xl">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-pink-950/20 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Lưu Trữ Ảnh Cloudfly S3 (Object Storage)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                S3-Compatible
              </span>
            </div>
            <p className="text-xs text-blue-200/70 mt-1 leading-relaxed max-w-2xl">
              Cấu hình trực tiếp kết nối S3 tại đây và lưu vào <strong>MongoDB</strong>. Toàn bộ ảnh sản phẩm, banner, logo và favicon được lưu trữ an toàn trên Cloudfly S3.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestS3}
          disabled={isTestingS3}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex-shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isTestingS3 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-blue-400" />}
          <span>{isTestingS3 ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối S3'}</span>
        </button>
      </div>

      {s3TestStatus.type && (
        <Alert
          type={s3TestStatus.type === 'success' ? 'success' : 'error'}
          showIcon
          message={s3TestStatus.type === 'success' ? 'Kết Nối S3 Thành Công' : 'Lỗi Kết Nối S3'}
          description={s3TestStatus.message}
          className="rounded-xl border border-white/10"
        />
      )}

      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Thông Số Kết Nối Cloudfly Object Storage</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name={['s3', 'endpoint']}
            label={<span className="text-xs font-semibold text-pink-200">S3 Endpoint URL</span>}
            rules={[{ required: true, message: 'Vui lòng nhập S3 Endpoint' }]}
            extra={<span className="text-[11px] text-pink-300/40">Ví dụ: https://s3.cloudfly.vn hoặc https://s3.hcm-1.cloudfly.vn</span>}
          >
            <Input placeholder="https://s3.cloudfly.vn" className="font-mono text-xs" />
          </Form.Item>

          <Form.Item
            name={['s3', 'region']}
            label={<span className="text-xs font-semibold text-pink-200">S3 Region</span>}
            extra={<span className="text-[11px] text-pink-300/40">Mặc định: us-east-1 hoặc auto</span>}
          >
            <Input placeholder="us-east-1" className="font-mono text-xs" />
          </Form.Item>

          <Form.Item
            name={['s3', 'bucket']}
            label={<span className="text-xs font-semibold text-pink-200">Tên Bucket Lưu Trữ (Bucket Name)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên Bucket' }]}
            extra={<span className="text-[11px] text-pink-300/40">Tên Bucket đã tạo trên bảng điều khiển Cloudfly</span>}
          >
            <Input placeholder="gamestore-accounts" className="font-mono text-xs" />
          </Form.Item>

          <Form.Item
            name={['s3', 'folder']}
            label={<span className="text-xs font-semibold text-pink-200">Thư Mục Gốc Lưu Trữ (Folder)</span>}
            extra={<span className="text-[11px] text-pink-300/40">Mặc định: accounts</span>}
          >
            <Input placeholder="accounts" className="font-mono text-xs" />
          </Form.Item>

          <Form.Item
            name={['s3', 'accessKeyId']}
            label={<span className="text-xs font-semibold text-pink-200">Access Key ID</span>}
            rules={[{ required: true, message: 'Vui lòng nhập Access Key ID' }]}
            extra={<span className="text-[11px] text-pink-300/40">Mã định danh khóa truy cập được cấp bởi Cloudfly</span>}
          >
            <Input placeholder="Ví dụ: CF89FA378192..." className="font-mono text-xs" />
          </Form.Item>

          <Form.Item
            name={['s3', 'secretAccessKey']}
            label={<span className="text-xs font-semibold text-pink-200">Secret Access Key</span>}
            rules={[{ required: true, message: 'Vui lòng nhập Secret Access Key' }]}
            extra={<span className="text-[11px] text-pink-300/40">Khóa bảo mật tương ứng</span>}
          >
            <Input.Password
              placeholder="••••••••••••••••••••••••"
              iconRender={(visible) => (visible ? <Eye className="w-4 h-4 text-pink-300/50" /> : <EyeOff className="w-4 h-4 text-pink-300/50" />)}
              className="font-mono text-xs"
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB: TELEGRAM BOT THÔNG BÁO TỰ ĐỘNG
  // ==========================================
  const telegramTab = (
    <div className="space-y-5 max-w-4xl">
      {/* HEADER BANNER CARD */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-[#1c081a]/60 to-[#120412]/80 border border-sky-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10 flex-shrink-0">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">🤖 Telegram Bot Thông Báo Tự Động Cho Admin</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                24/7 Realtime
              </span>
            </div>
            <p className="text-xs text-sky-200/70 mt-1 leading-relaxed max-w-2xl">
              Nhận thông báo tức thì về điện thoại khi có giao dịch <strong>Nạp tiền thành công</strong>, <strong>Đơn mua nick mới</strong>, hoặc <strong>Cảnh báo khi kho nick sắp hết</strong> mà không cần mở website.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestTelegram}
          disabled={isTestingTelegram}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition flex-shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isTestingTelegram ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-sky-400" />
          )}
          <span>{isTestingTelegram ? 'Đang gửi test...' : 'Kiểm Tra Kết Nối Bot'}</span>
        </button>
      </div>

      {/* TEST RESULT ALERT */}
      {telegramTestStatus.type && (
        <Alert
          type={telegramTestStatus.type === 'success' ? 'success' : 'error'}
          showIcon
          message={telegramTestStatus.type === 'success' ? 'Kết Nối Telegram Bot Thành Công!' : 'Lỗi Kết Nối Telegram Bot'}
          description={telegramTestStatus.message}
          className="rounded-xl border border-white/10"
        />
      )}

      {/* MAIN CONFIGURATION */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>Thông Số Kết Nối Telegram API</span>
          </div>
        </h4>

        {/* ENABLE SWITCH */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/5">
          <div>
            <div className="text-xs font-bold text-white">Kích Hoạt Telegram Bot Thông Báo</div>
            <div className="text-[11px] text-pink-300/50 mt-0.5">
              Bật để hệ thống tự động gửi tin nhắn mỗi khi có sự kiện giao dịch mới
            </div>
          </div>
          <Form.Item name={['telegram', 'enabled']} valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <Form.Item
            name={['telegram', 'botToken']}
            label={<span className="text-xs font-semibold text-pink-200">Telegram Bot Token (HTTP API Token)</span>}
            extra={<span className="text-[11px] text-pink-300/40">Chuỗi Token được cấp bởi @BotFather (Ví dụ: 123456789:ABCdefGhI...)</span>}
          >
            <Input.Password
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
              iconRender={(visible) => (visible ? <Eye className="w-4 h-4 text-pink-300/50" /> : <EyeOff className="w-4 h-4 text-pink-300/50" />)}
              className="font-mono text-xs"
            />
          </Form.Item>

          <Form.Item
            name={['telegram', 'chatId']}
            label={<span className="text-xs font-semibold text-pink-200">Telegram Chat ID / Group ID</span>}
            extra={<span className="text-[11px] text-pink-300/40">Chat ID cá nhân (ví dụ: 1098765432) hoặc Chat ID nhóm (ví dụ: -100123456789)</span>}
          >
            <Input placeholder="1098765432" className="font-mono text-xs" />
          </Form.Item>
        </div>
      </div>

      {/* NOTIFICATION EVENT TOGGLES */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>Tùy Chọn Nhận Sự Kiện Thông Báo</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* EVENT 1: DEPOSIT */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-white block">💰 Nạp Tiền Thành Công</span>
                <span className="text-[11px] text-pink-300/50 mt-1 block">
                  Báo cáo khi khách nạp ví qua VietQR / SePay kèm số tiền và tên khách
                </span>
              </div>
              <Form.Item name={['telegram', 'notifyDeposit']} valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
            </div>
          </div>

          {/* EVENT 2: ORDER */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-white block">🛒 Đơn Mua Nick Mới</span>
                <span className="text-[11px] text-pink-300/50 mt-1 block">
                  Báo cáo khi khách mua nick game (mã nick, tựa game, giá tiền, mã giảm giá)
                </span>
              </div>
              <Form.Item name={['telegram', 'notifyOrder']} valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
            </div>
          </div>

          {/* EVENT 3: LOW STOCK */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-white block">⚠️ Cảnh Báo Kho Sắp Hết</span>
                <span className="text-[11px] text-pink-300/50 mt-1 block">
                  Cảnh báo ngay khi số lượng nick khả dụng của game chạm ngưỡng
                </span>
              </div>
              <Form.Item name={['telegram', 'notifyLowStock']} valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
            </div>
          </div>
        </div>

        {/* LOW STOCK THRESHOLD */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-white">Ngưỡng Số Lượng Nick Khả Dụng Để Cảnh Báo</div>
            <div className="text-[11px] text-pink-300/50 mt-0.5">
              Khi số lượng nick sẵn có của bất kỳ tựa game nào ≤ ngưỡng này, Bot sẽ lập tức gửi cảnh báo
            </div>
          </div>
          <div className="w-40 flex-shrink-0">
            <Form.Item name={['telegram', 'lowStockThreshold']} noStyle>
              <InputNumber min={1} max={50} style={{ width: '100%' }} className="w-full" addonAfter="nick" />
            </Form.Item>
          </div>
        </div>
      </div>

      {/* STEP-BY-STEP QUICK GUIDE */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-[#18091a]/80 to-[#120412]/80 border border-white/10 space-y-3">
        <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span>Hướng Dẫn Tạo & Kết Nối Telegram Bot Trong 2 Phút</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-pink-200/80">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">1</span>
              <span>Tạo Bot với @BotFather</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Mở Telegram, tìm kiếm <strong>@BotFather</strong>, gửi lệnh <code className="text-sky-300 bg-black/60 px-1 py-0.5 rounded">/newbot</code>, đặt tên cho bot và copy chuỗi <strong>HTTP API Token</strong> dán vào ô bên trên.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">2</span>
              <span>Lấy Chat ID của bạn</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Tìm kiếm bot <strong>@userinfobot</strong> hoặc <strong>@RawDataBot</strong>, bấm <code className="text-sky-300 bg-black/60 px-1 py-0.5 rounded">/start</code> để lấy số <strong>Id</strong> của bạn.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px]">3</span>
              <span>Khởi động Bot (Quan Trọng)</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Hãy mở cuộc trò chuyện với chính con bot vừa tạo và bấm <strong>Start</strong> hoặc gửi tin nhắn <code className="text-rose-300 bg-black/60 px-1 py-0.5 rounded">/start</code> để bot có quyền nhắn tin cho bạn.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">4</span>
              <span>Kiểm Tra & Lưu Lại</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Bấm nút <strong>"Kiểm Tra Kết Nối Bot"</strong> ở trên để nhận tin nhắn chào mừng. Sau đó bấm <strong>"Lưu Tất Cả Thiết Lập"</strong> để hoàn tất!
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 9: GOOGLE OAUTH 2.0 ĐĂNG NHẬP
  // ==========================================
  const googleAuthTab = (
    <div className="space-y-5 max-w-3xl">
      {/* TRẠNG THÁI KẾT NỐI GOOGLE OAUTH */}
      <div className="p-5 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5 shadow">
              <GoogleIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Đăng Nhập Bằng Tài Khoản Google (GIS Popup)
              </h4>
              <p className="text-[11px] text-pink-300/50 mt-0.5">
                Cho phép khách hàng đăng nhập/đăng ký nhanh 1 chạm bằng Google Identity Services
              </p>
            </div>
          </div>
          <Form.Item name={['googleAuth', 'enabled']} valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>

        <div className="space-y-4 pt-2">
          <Form.Item
            name={['googleAuth', 'clientId']}
            label={<span className="text-xs font-semibold text-pink-200">Google Client ID (Bắt buộc)</span>}
            extra={
              <span className="text-[11px] text-pink-300/50">
                Chuỗi ID ứng dụng tạo từ Google Cloud Console (Dạng: <code className="text-rose-300 font-mono">xxxx-xxxx.apps.googleusercontent.com</code>)
              </span>
            }
          >
            <Input
              placeholder="835508341032-ed2b0dc3r7dh3bhtj03jvk1o2ir1nc82.apps.googleusercontent.com"
              className="font-mono text-xs"
            />
          </Form.Item>

          <Form.Item
            name={['googleAuth', 'clientSecret']}
            label={<span className="text-xs font-semibold text-pink-200">Google Client Secret (Tùy chọn)</span>}
            extra={
              <span className="text-[11px] text-pink-300/50">
                Chỉ cần thiết nếu sử dụng thêm luồng redirect server code exchange (không bắt buộc với GIS Popup)
              </span>
            }
          >
            <Input.Password
              placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </Form.Item>
        </div>
      </div>

      {/* THÔNG TIN CẤU HÌNH TẠI GOOGLE CLOUD CONSOLE */}
      <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>Thông Tin Cần Khai Báo Tại Google Cloud Console</span>
        </h4>

        <div className="space-y-3">
          {/* Authorized JavaScript Origins */}
          <div className="p-3.5 rounded-xl bg-[#1c081a]/60 border border-white/5 space-y-2">
            <span className="text-xs font-bold text-white block">1. Authorized JavaScript origins (Bắt buộc cho GIS Popup):</span>
            <div className="space-y-1.5 font-mono text-xs text-pink-200">
              {[
                { url: 'http://localhost:3000', label: 'Local Dev (Port 3000)' },
                { url: 'http://localhost:5173', label: 'Local Dev (Port 5173)' },
                ...(form.getFieldValue('siteUrl') ? [{ url: form.getFieldValue('siteUrl'), label: 'Production Domain' }] : []),
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/5">
                  <span className="truncate mr-2">{item.url}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-pink-300/40">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        message.success(`Đã sao chép: ${item.url}`);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-pink-300 hover:text-white transition cursor-pointer"
                      title="Sao chép"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Authorized Redirect URIs */}
          <div className="p-3.5 rounded-xl bg-[#1c081a]/60 border border-white/5 space-y-2">
            <span className="text-xs font-bold text-white block">2. Authorized redirect URIs:</span>
            <div className="space-y-1.5 font-mono text-xs text-pink-200">
              {[
                { url: 'http://localhost:3000/api/auth/google/callback', label: 'Local 3000' },
                { url: 'http://localhost:5173/api/auth/google/callback', label: 'Local 5173' },
                ...(form.getFieldValue('siteUrl') ? [{ url: `${form.getFieldValue('siteUrl').replace(/\/$/, '')}/api/auth/google/callback`, label: 'Production' }] : []),
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/5">
                  <span className="truncate mr-2">{item.url}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-pink-300/40">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        message.success(`Đã sao chép: ${item.url}`);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-pink-300 hover:text-white transition cursor-pointer"
                      title="Sao chép"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STEP BY STEP GUIDE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px]">1</span>
              <span>Tạo OAuth Client ID</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-rose-400 hover:underline">Google Cloud Console</a>, chọn <strong>Create Credentials -&gt; OAuth Client ID</strong> (Loại: Web application).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">2</span>
              <span>Dán Origins &amp; Redirects</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Copy các đường dẫn bên trên dán vào mục <strong>Authorized JavaScript origins</strong> và <strong>Authorized redirect URIs</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">3</span>
              <span>Copy Client ID &amp; Lưu</span>
            </div>
            <p className="text-[11px] text-pink-300/60 leading-relaxed">
              Copy chuỗi <strong>Client ID</strong> dán vào ô bên trên, bật công tắc và bấm <strong>"Lưu Tất Cả Thiết Lập"</strong>!
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 10: BẢO MẬT ADMIN
  // ==========================================
  const securityTab = (
    <div className="space-y-4 max-w-2xl">
      <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
        <div className="p-4 rounded-2xl bg-[#1c081a]/60 border border-white/5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">
            Đổi Mật Khẩu Quản Trị Viên
          </h4>

          <Form.Item
            name="oldPassword"
            label={<span className="text-xs font-semibold text-pink-200">Mật Khẩu Hiện Tại</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="newPassword"
              label={<span className="text-xs font-semibold text-pink-200">Mật Khẩu Mới</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                { min: 8, message: 'Tối thiểu 8 ký tự' },
              ]}
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-xs font-semibold text-pink-200">Xác Nhận Mật Khẩu</span>}
              rules={[{ required: true, message: 'Vui lòng xác nhận lại mật khẩu' }]}
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-bold transition cursor-pointer"
            >
              {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isChangingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</span>
            </button>
          </div>
        </div>
      </Form>
    </div>
  );

  // Tabs structure definition
  const tabItems = [
    {
      key: 'general',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Store className="w-3.5 h-3.5 text-rose-400" />
          <span>Thông Tin Chung</span>
        </span>
      ),
      children: generalTab,
    },
    {
      key: 'branding',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
          <span>Logo & Favicon</span>
        </span>
      ),
      children: brandingTab,
    },
    {
      key: 'seo',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>SEO & Open Graph</span>
        </span>
      ),
      children: seoTab,
    },
    {
      key: 'contact',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
          <span>Liên Hệ & Footer</span>
        </span>
      ),
      children: contactTab,
    },
    {
      key: 'social',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Share2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Mạng Xã Hội</span>
        </span>
      ),
      children: socialTab,
    },
    {
      key: 'announcement',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Megaphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Thanh Thông Báo</span>
        </span>
      ),
      children: announcementTab,
    },
    {
      key: 'maintenance',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Wrench className="w-3.5 h-3.5 text-orange-400" />
          <span>Bảo Trì Hệ Thống</span>
        </span>
      ),
      children: maintenanceTab,
    },
    {
      key: 'payment',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ngân Hàng & SePay</span>
        </span>
      ),
      children: paymentTab,
    },
    {
      key: 's3',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
          <span>Lưu Trữ S3 Cloudfly</span>
        </span>
      ),
      children: s3Tab,
    },
    {
      key: 'telegram',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <Bot className="w-3.5 h-3.5 text-sky-400" />
          <span>Telegram Bot</span>
        </span>
      ),
      children: telegramTab,
    },
    {
      key: 'googleAuth',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <GoogleIcon className="w-3.5 h-3.5" />
          <span>Đăng Nhập Google</span>
        </span>
      ),
      children: googleAuthTab,
    },
    {
      key: 'security',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Bảo Mật Admin</span>
        </span>
      ),
      children: securityTab,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <AdminPageHeader
        title="Cài Đặt Website & Vận Hành Hệ Thống"
        description="Quản trị thông tin thương hiệu, Logo, Favicon, SEO Open Graph, Mạng xã hội, Thanh thông báo, Bảo trì, Cổng thanh toán SePay và S3 Cloudfly"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSettings}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-pink-200 border border-white/10 transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || loading}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Đang lưu MongoDB...' : 'Lưu Tất Cả Thiết Lập'}</span>
            </button>
          </div>
        }
      />

      {/* TABS & FORM */}
      <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl">
        <Form form={form} layout="vertical" component={false}>
          <Tabs items={tabItems} className="custom-admin-tabs" defaultActiveKey="general" />
        </Form>
      </div>

      {/* BANK EDIT / ADD MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-white text-sm font-bold pb-2 border-b border-white/10">
            <Building2 className="w-4 h-4 text-rose-400" />
            <span>{editingBankIndex !== null ? 'Chỉnh Sửa Tài Khoản Ngân Hàng' : 'Thêm Tài Khoản Ngân Hàng Mới'}</span>
          </div>
        }
        open={isBankModalOpen}
        onCancel={() => setIsBankModalOpen(false)}
        onOk={handleSaveBankModal}
        okText="Xác Nhận"
        cancelText="Hủy Bỏ"
        width={650}
        destroyOnClose
        centered
        className="custom-admin-modal"
      >
        <Form form={bankModalForm} layout="vertical" className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="bankCode"
              label={<span className="text-xs font-semibold text-pink-200">Chọn Ngân Hàng (Hỗ trợ SePay)</span>}
              rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}
            >
              <Select
                options={SEPAY_SUPPORTED_BANKS.map((b) => ({
                  value: b.code,
                  label: `${b.code} - ${b.shortName}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="accountNumber"
              label={<span className="text-xs font-semibold text-pink-200">Số Tài Khoản Hoặc Số VA</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số tài khoản' }]}
            >
              <Input placeholder="0987654321" className="font-mono text-xs" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="accountHolder"
              label={<span className="text-xs font-semibold text-pink-200">Tên Chủ Tài Khoản (In hoa)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản' }]}
            >
              <Input placeholder="NGUYEN VAN A" className="uppercase font-mono text-xs" />
            </Form.Item>

            <Form.Item
              name="branch"
              label={<span className="text-xs font-semibold text-pink-200">Chi Nhánh (Tùy chọn)</span>}
            >
              <Input placeholder="Hà Nội / Hội Sở" className="text-xs" />
            </Form.Item>
          </div>

          {/* VA CONFIGURATION ACCORDING TO SEPAY SPECS */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              <span>Cấu Hình Virtual Account (VA) & Nhận Diện Giao Dịch</span>
            </div>

            <Form.Item
              name="vaMode"
              label={<span className="text-xs text-pink-200">Chế Độ Nhận Webhook:</span>}
            >
              <Select
                options={[
                  { value: 'all', label: 'Tất cả tài khoản (Mọi giao dịch trên tài khoản)' },
                  { value: 'specific', label: 'Chọn cụ thể (Chỉ nhận theo danh sách VA/TKP bên dưới)' },
                ]}
              />
            </Form.Item>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <div>
                <span className="text-xs font-bold text-white block">Nhận tiền từ Tài khoản chính:</span>
                <span className="text-[10px] text-pink-300/50">
                  (Với BIDV, MSB, KienlongBank, OCB: Bắt buộc dùng VA, tài khoản chính tự khóa)
                </span>
              </div>
              <Form.Item name="useMainAccount" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
              <span className="text-xs font-semibold text-white">Đặt làm mặc định VietQR:</span>
              <Form.Item name="isDefault" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
              <span className="text-xs font-semibold text-white">Trạng thái hoạt động:</span>
              <Form.Item name="active" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

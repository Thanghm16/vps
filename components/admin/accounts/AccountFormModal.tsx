'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { GameAccount } from '@/types/account';
import { AccountCredentials } from '@/types/db-account';
import { Modal, Form, Input, InputNumber, Select, Switch, App } from 'antd';
import {
    Gamepad2,
    Trophy,
    DollarSign,
    FileText,
    ShieldCheck,
    Lock,
    Plus,
    Trash2,
    UploadCloud,
    Loader2,
    X,
} from 'lucide-react';

interface GameOption {
    name: string;
    slug: string;
}

interface CustomAttribute {
    id: string;
    key: string;
    value: string;
}

interface AccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAccount?: (GameAccount & { gameSlug?: string; credentials?: AccountCredentials }) | null;
    games?: GameOption[];
    onSave: (accountData: Record<string, unknown>) => Promise<void> | void;
}

export default function AccountFormModal({
    isOpen,
    onClose,
    initialAccount,
    games = [],
    onSave,
}: AccountFormModalProps) {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [submitting, setSubmitting] = useState(false);
    const isEditing = !!initialAccount;

    // State cho Thuộc tính mở rộng dạng Object Key-Value
    const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([]);

    // State cho Cloudfly S3 Upload
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('/1768727344439.jpg');
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    const thumbInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    // Khởi tạo form và state mỗi khi mở modal
    const handleModalOpen = useCallback(
        (open: boolean) => {
            if (!open) return;

            if (initialAccount) {
                const details = (initialAccount.details || {}) as Record<string, unknown>;
                const credentials: Partial<AccountCredentials> = initialAccount.credentials || {};

                const initialThumb = initialAccount.thumbnail || '/1768727344439.jpg';
                setThumbnailUrl(initialThumb);

                const initialImages =
                    Array.isArray(initialAccount.images) && initialAccount.images.length > 0
                        ? initialAccount.images
                        : [initialThumb];
                setGalleryImages(initialImages);

                // Khôi phục tất cả thuộc tính dạng Object Key-Value từ details
                const loadedCustomAttrs: CustomAttribute[] = [];
                Object.entries(details).forEach(([k, v]) => {
                    if (v !== undefined && v !== null && (typeof v === 'string' || typeof v === 'number')) {
                        loadedCustomAttrs.push({
                            id: Math.random().toString(36).substring(2, 9),
                            key: k,
                            value: String(v),
                        });
                    }
                });
                setCustomAttributes(loadedCustomAttrs);

                form.setFieldsValue({
                    gameSlug: initialAccount.gameId || initialAccount.gameSlug || games[0]?.slug || 'lien-quan',
                    code: initialAccount.code,
                    title: initialAccount.title,
                    price: initialAccount.price,
                    originalPrice: initialAccount.originalPrice,
                    thumbnail: initialThumb,
                    description: initialAccount.description,
                    tags: Array.isArray(initialAccount.tags) ? initialAccount.tags.join(', ') : '',
                    status: initialAccount.status || 'available',
                    isFeatured: !!initialAccount.isFeatured,
                    isVerified: !!initialAccount.isVerified,
                    isHot: !!initialAccount.isHot,

                    // Security Credentials
                    loginUsername: credentials.loginUsername || '',
                    loginPassword: credentials.loginPassword || '',
                    twoFactorCode: credentials.twoFactorCode || '',
                    emailBound: credentials.emailBound || 'Trắng thông tin',
                    phoneBound: credentials.phoneBound || 'Trắng thông tin',
                    credentialsNote: credentials.note || '',
                });
            } else {
                form.resetFields();
                const defaultGame = games[0]?.slug || 'lien-quan';
                setThumbnailUrl('/1768727344439.jpg');
                setGalleryImages(['/1768727344439.jpg']);
                setCustomAttributes([]); // Khởi tạo trống, người dùng tự ấn + Thêm Thuộc Tính

                form.setFieldsValue({
                    gameSlug: defaultGame,
                    code: `#${defaultGame.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
                    status: 'available',
                    isFeatured: false,
                    isVerified: true,
                    isHot: false,
                    emailBound: 'Trắng thông tin',
                    phoneBound: 'Trắng thông tin',
                    price: 500000,
                    originalPrice: 750000,
                    thumbnail: '/1768727344439.jpg',
                });
            }
        },
        [initialAccount, games, form],
    );

    // Quản lý danh sách thuộc tính Key-Value
    const handleAddAttribute = () => {
        setCustomAttributes((prev) => [
            ...prev,
            { id: Math.random().toString(36).substring(2, 9), key: '', value: '' },
        ]);
    };

    const handleRemoveAttribute = (id: string) => {
        setCustomAttributes((prev) => prev.filter((a) => a.id !== id));
    };

    const handleAttributeChange = (id: string, field: 'key' | 'value', val: string) => {
        setCustomAttributes((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
    };

    // Upload Thumbnail lên S3 Cloudfly
    const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingThumb(true);
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success && data.url) {
                setThumbnailUrl(data.url);
                form.setFieldsValue({ thumbnail: data.url });
                message.success('Tải ảnh đại diện lên  thành công!');
            } else {
                message.error(data.message || 'Tải ảnh lên S3 thất bại.');
            }
        } catch {
            message.error('Lỗi kết nối khi tải ảnh lên.');
        } finally {
            setUploadingThumb(false);
            if (thumbInputRef.current) thumbInputRef.current.value = '';
        }
    };

    // Upload Album ảnh chi tiết lên S3 Cloudfly
    const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploadingGallery(true);
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (data.success && data.url) {
                    uploadedUrls.push(data.url);
                }
            }

            if (uploadedUrls.length > 0) {
                setGalleryImages((prev) => [...prev, ...uploadedUrls]);
                message.success(`Đã tải ${uploadedUrls.length} ảnh lên Cloudfly S3!`);
            }
        } catch {
            message.error('Lỗi khi tải ảnh album lên Cloudfly S3.');
        } finally {
            setUploadingGallery(false);
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const handleRemoveGalleryImage = (index: number) => {
        setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const tagsArray = values.tags
                ? values.tags
                      .split(',')
                      .map((t: string) => t.trim())
                      .filter(Boolean)
                : [];
            const rareSkinsArray = values.rareSkins
                ? values.rareSkins
                      .split(',')
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                : [];

            // Chuyển đổi customAttributes (Key-Value) thành Object value thực thụ
            const customObject: Record<string, string> = {};
            customAttributes.forEach((attr) => {
                if (attr.key && attr.key.trim()) {
                    customObject[attr.key.trim()] = attr.value ? attr.value.trim() : '';
                }
            });

            // Trích xuất rank/level/server nếu có để hỗ trợ sort/filter và tương thích hiển thị
            const rankVal = customObject['Xếp hạng'] || customObject['Rank'] || customObject['rank'] || '';
            const levelVal =
                Number(customObject['Cấp độ'] || customObject['Level'] || customObject['level']) || undefined;
            const serverVal = customObject['Máy chủ'] || customObject['Server'] || customObject['server'] || '';
            const champsVal =
                Number(
                    customObject['Số tướng'] ||
                        customObject['Tướng'] ||
                        customObject['championsCount'] ||
                        customObject['heroCount'],
                ) || undefined;
            const skinsVal =
                Number(
                    customObject['Số trang phục'] ||
                        customObject['Trang phục'] ||
                        customObject['skinsCount'] ||
                        customObject['skinCount'],
                ) || undefined;

            // Xây dựng mixed details linh hoạt cho nick game
            const mixedDetails: Record<string, unknown> = {
                ...customObject,
                ...(rankVal ? { rank: rankVal } : {}),
                ...(levelVal !== undefined ? { level: levelVal } : {}),
                ...(serverVal ? { server: serverVal } : {}),
                ...(champsVal !== undefined ? { championsCount: champsVal, heroCount: champsVal } : {}),
                ...(skinsVal !== undefined ? { skinsCount: skinsVal, skinCount: skinsVal } : {}),
            };

            // Xây dựng thông tin bàn giao bảo mật
            const credentials = {
                loginUsername: values.loginUsername || '',
                loginPassword: values.loginPassword || '',
                twoFactorCode: values.twoFactorCode || '',
                emailBound: values.emailBound || 'Trắng thông tin',
                phoneBound: values.phoneBound || 'Trắng thông tin',
                note: values.credentialsNote || '',
            };

            const selectedGameObj = games.find((g) => g.slug === values.gameSlug);
            const gameName = selectedGameObj ? selectedGameObj.name : 'Game Online';

            const finalThumb = values.thumbnail || thumbnailUrl || '/1768727344439.jpg';
            const finalImages = galleryImages.length > 0 ? galleryImages : [finalThumb];

            await onSave({
                code: values.code.trim().toUpperCase(),
                gameSlug: values.gameSlug,
                gameName,
                title: values.title.trim(),
                price: Number(values.price),
                originalPrice: Number(values.originalPrice || values.price),
                thumbnail: finalThumb,
                images: finalImages,
                tags: tagsArray,
                description: values.description || '',
                status: values.status,
                isVerified: !!values.isVerified,
                isFeatured: !!values.isFeatured,
                isHot: !!values.isHot,
                details: mixedDetails,
                credentials,
            });

            onClose();
        } catch (error: unknown) {
            if ((error as { errorFields?: unknown })?.errorFields) {
                message.error('Vui lòng kiểm tra lại các trường bắt buộc!');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const gameOptions = games.map((g) => ({
        value: g.slug,
        label: g.name,
    }));

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            onOk={handleSubmit}
            afterOpenChange={handleModalOpen}
            confirmLoading={submitting}
            okText={isEditing ? 'Lưu Thay Đổi' : 'Tạo Nick Mới'}
            cancelText="Hủy Bỏ"
            width={880}
            title={
                <div className="flex items-center gap-2 text-white font-bold text-base pb-1">
                    <Gamepad2 className="w-5 h-5 text-rose-500" />
                    <span>{isEditing ? `Chỉnh Sửa Nick ${initialAccount?.code}` : 'Thêm Nick Mới Vào Kho'}</span>
                </div>
            }
            styles={{
                body: {
                    background: '#180a17',
                    padding: '1.25rem',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                },
                header: {
                    background: '#1a0a19',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                },
            }}
        >
            <Form form={form} layout="vertical" className="space-y-5 pt-2 text-white">
                {/* SECTION 1: THÔNG TIN CƠ BẢN */}
                <div className="p-4 rounded-2xl bg-[#1f0c1e]/70 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider pb-2 border-b border-white/5">
                        <Gamepad2 className="w-4 h-4 text-rose-400" />
                        <span>1. Thông Tin Cơ Bản</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item
                            name="gameSlug"
                            label={<span className="text-xs font-semibold text-pink-200">Tựa Game</span>}
                            rules={[{ required: true, message: 'Vui lòng chọn game!' }]}
                        >
                            <Select
                                className="w-full"
                                options={
                                    gameOptions.length > 0
                                        ? gameOptions
                                        : [
                                              { value: 'lien-quan', label: 'Liên Quân Mobile' },
                                              { value: 'valorant', label: 'Valorant' },
                                          ]
                                }
                            />
                        </Form.Item>

                        <Form.Item
                            name="code"
                            label={<span className="text-xs font-semibold text-pink-200">Mã Số Nick (Độc nhất)</span>}
                            rules={[{ required: true, message: 'Nhập mã nick (VD: #LQ10291)!' }]}
                        >
                            <Input placeholder="#LQ10291, #VAL-8821..." className="font-mono uppercase" />
                        </Form.Item>

                        <Form.Item
                            name="title"
                            label={<span className="text-xs font-semibold text-pink-200">Tiêu Đề Bài Đăng</span>}
                            rules={[{ required: true, message: 'Nhập tiêu đề nick!' }]}
                            className="sm:col-span-2"
                        >
                            <Input placeholder="VD: Nick Cao Thủ Full Tướng 247 Trang Phục SSS Thần Long" />
                        </Form.Item>
                    </div>
                </div>

                {/* SECTION 2: THÔNG SỐ CHI TIẾT & THUỘC TÍNH (DYNAMIC KEY-VALUE) */}
                <div className="p-4 rounded-2xl bg-[#1f0c1e]/70 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                            <Trophy className="w-4 h-4 text-purple-400" />
                            <span>2. Thông Số Chi Tiết & Thuộc Tính Game (Key - Value)</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddAttribute}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Thêm Thuộc Tính</span>
                        </button>
                    </div>

                    {customAttributes.length === 0 ? (
                        <div className="p-4 rounded-xl bg-black/30 border border-dashed border-white/10 text-center space-y-2">
                            <p className="text-xs text-pink-200/70">
                                Chưa có thuộc tính nào được thêm cho nick game này.
                            </p>
                            <p className="text-[11px] text-pink-300/40 leading-relaxed">
                                Nhấn nút <strong className="text-purple-300">+ Thêm Thuộc Tính</strong> ở góc phải để
                                thêm bất kỳ thông số nào (ví dụ: <em>Xếp hạng</em>: Cao Thủ, <em>Cấp độ</em>: 30,{' '}
                                <em>Máy chủ</em>: Việt Nam, <em>Số tướng</em>: 100, <em>Pet</em>: Rồng Băng,{' '}
                                <em>Giá trị đội hình</em>: 1.500 Tỷ...).
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {customAttributes.map((attr) => (
                                <div key={attr.id} className="flex items-center gap-2">
                                    <Input
                                        placeholder="Tên thuộc tính (VD: Xếp hạng, Cấp độ, Máy chủ, Pet, Đội hình...)"
                                        value={attr.key}
                                        onChange={(e) => handleAttributeChange(attr.id, 'key', e.target.value)}
                                        className="bg-black/40 border-white/10 text-white rounded-xl text-xs flex-1"
                                    />
                                    <Input
                                        placeholder="Giá trị (VD: Cao Thủ, 30, Việt Nam, Rồng Băng Lv5, 1.500 Tỷ...)"
                                        value={attr.value}
                                        onChange={(e) => handleAttributeChange(attr.id, 'value', e.target.value)}
                                        className="bg-black/40 border-white/10 text-white rounded-xl text-xs flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAttribute(attr.id)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-rose-400 border border-white/5 transition cursor-pointer"
                                        title="Xóa thuộc tính này"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SECTION 3: HÌNH ẢNH & KHO ĐỒ (S3 CLOUDFLY STORAGE) */}
                <div className="p-4 rounded-2xl bg-[#1f0c1e]/70 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                            <UploadCloud className="w-4 h-4 text-blue-400" />
                            <span>3. Hình Ảnh & Kho Đồ </span>
                        </div>
                    </div>

                    {/* ẢNH THUMBNAIL CHÍNH */}
                    <div>
                        <label className="block text-xs font-semibold text-pink-200 mb-2">
                            Ảnh Đại Diện Chính (Thumbnail)
                        </label>

                        <input
                            type="file"
                            ref={thumbInputRef}
                            onChange={handleUploadThumbnail}
                            accept="image/*"
                            style={{ display: 'none' }}
                            className="hidden"
                        />

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex-shrink-0 group">
                                <Image
                                    src={thumbnailUrl || '/1768727344439.jpg'}
                                    alt="Thumbnail"
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                                {uploadingThumb && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <button
                                    type="button"
                                    onClick={() => thumbInputRef.current?.click()}
                                    disabled={uploadingThumb}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition cursor-pointer"
                                >
                                    {uploadingThumb ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <UploadCloud className="w-4 h-4" />
                                    )}
                                    <span>{uploadingThumb ? 'Đang tải lên S3...' : 'Tải Ảnh Đại Diện Lên'}</span>
                                </button>
                                <p className="text-[11px] text-pink-300/50">
                                    Hỗ trợ định dạng JPG, PNG, WEBP tối đa 10MB được lưu trữ trên Cloudfly S3.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ALBUM ẢNH CHI TIẾT KHO ĐỒ */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-pink-200">Album Ảnh Chi Tiết Kho Đồ</label>

                            <input
                                type="file"
                                ref={galleryInputRef}
                                onChange={handleUploadGallery}
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => galleryInputRef.current?.click()}
                                disabled={uploadingGallery}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-pink-200 border border-white/10 transition cursor-pointer"
                            >
                                {uploadingGallery ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                )}
                                <span>Thêm Ảnh Album S3</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {galleryImages.map((imgUrl, idx) => (
                                <div
                                    key={idx}
                                    className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/10 group"
                                >
                                    <Image
                                        src={imgUrl}
                                        alt={`Ảnh ${idx + 1}`}
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGalleryImage(idx)}
                                        className="absolute top-1 right-1 p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition"
                                        title="Xóa ảnh"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SECTION 4: THÔNG TIN BẢO MẬT & BÀN GIAO (CHỈ ADMIN & KHÁCH MUA) */}
                <div className="p-4 rounded-2xl bg-[#2a0e1c]/80 border border-rose-500/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-rose-500/20 border-b">
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                            <Lock className="w-4 h-4 text-rose-500" />
                            <span>4. Thông Tin Đăng Nhập & Bảo Mật (Chỉ Admin & Người Mua)</span>
                        </div>
                        <span className="text-[10px] text-rose-300/70 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            BẢO MẬT TUYỆT ĐỐI
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item
                            name="loginUsername"
                            label={<span className="text-xs font-semibold text-pink-200">Tài Khoản Game / Email</span>}
                            rules={[{ required: true, message: 'Nhập tài khoản đăng nhập!' }]}
                        >
                            <Input placeholder="user_game123 hoặc email@domain.com" />
                        </Form.Item>

                        <Form.Item
                            name="loginPassword"
                            label={<span className="text-xs font-semibold text-pink-200">Mật Khẩu Game</span>}
                            rules={[{ required: true, message: 'Nhập mật khẩu!' }]}
                        >
                            <Input.Password placeholder="••••••••" />
                        </Form.Item>

                        <Form.Item
                            name="twoFactorCode"
                            label={
                                <span className="text-xs font-semibold text-pink-200">
                                    Mã 2FA / Mã Dự Phòng (Nếu có)
                                </span>
                            }
                        >
                            <Input placeholder="Mã backup 2FA / Riot Code" />
                        </Form.Item>

                        <Form.Item
                            name="emailBound"
                            label={<span className="text-xs font-semibold text-pink-200">Tình Trạng Email</span>}
                        >
                            <Select
                                options={[
                                    { value: 'Trắng thông tin', label: 'Trắng thông tin (An toàn nhất)' },
                                    { value: 'Đã đổi sang mail shop', label: 'Đã đổi sang mail shop' },
                                    { value: 'Mail ảo vĩnh viễn', label: 'Mail ảo vĩnh viễn' },
                                    { value: 'Mail gốc theo nick', label: 'Bàn giao luôn mail gốc' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            name="phoneBound"
                            label={<span className="text-xs font-semibold text-pink-200">Tình Trạng SĐT</span>}
                        >
                            <Select
                                options={[
                                    { value: 'Trắng thông tin', label: 'Trắng thông tin (Chưa kích hoạt)' },
                                    { value: 'Đã hủy liên kết', label: 'Đã hủy liên kết SĐT' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            name="credentialsNote"
                            label={
                                <span className="text-xs font-semibold text-pink-200">
                                    Hướng Dẫn Bàn Giao Cho Khách
                                </span>
                            }
                        >
                            <Input placeholder="VD: Sau khi mua liên hệ admin để hỗ trợ đổi mail..." />
                        </Form.Item>
                    </div>
                </div>

                {/* SECTION 5: GIÁ BÁN & KHUYẾN MÃI */}
                <div className="p-4 rounded-2xl bg-[#1f0c1e]/70 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider pb-2 border-b border-white/5">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <span>5. Giá Bán & Khuyến Mãi</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item
                            name="price"
                            label={<span className="text-xs font-semibold text-pink-200">Giá Bán Thực Tế (VNĐ)</span>}
                            rules={[{ required: true, message: 'Nhập giá bán!' }]}
                        >
                            <InputNumber
                                min={10000}
                                step={50000}
                                style={{ width: '100%' }}
                                className="w-full"
                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                        </Form.Item>

                        <Form.Item
                            name="originalPrice"
                            label={<span className="text-xs font-semibold text-pink-200">Giá Gốc Niêm Yết (VNĐ)</span>}
                        >
                            <InputNumber
                                min={10000}
                                step={50000}
                                style={{ width: '100%' }}
                                className="w-full"
                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                        </Form.Item>
                    </div>
                </div>

                {/* SECTION 6: MÔ TẢ & THẺ TÌM KIẾM */}
                <div className="p-4 rounded-2xl bg-[#1f0c1e]/70 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-pink-300 uppercase tracking-wider pb-2 border-b border-white/5">
                        <FileText className="w-4 h-4 text-pink-400" />
                        <span>6. Mô Tả Chi Tiết & Tags</span>
                    </div>

                    <Form.Item
                        name="description"
                        label={<span className="text-xs font-semibold text-pink-200">Mô Tả Chi Tiết</span>}
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Mô tả thông tin ngọc, tướng tủ, tài khoản sạch, bảo hành..."
                        />
                    </Form.Item>

                    <Form.Item
                        name="tags"
                        label={
                            <span className="text-xs font-semibold text-pink-200">Thẻ Tìm Kiếm (phẩy ngăn cách)</span>
                        }
                    >
                        <Input placeholder="Full Tướng, Full Ngọc, Trắng Thông Tin, SSS..." />
                    </Form.Item>
                </div>

                {/* SECTION 7: TRẠNG THÁI & THUỘC TÍNH */}
                <div className="p-4 rounded-2xl bg-[#1f0c1e]/70 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider pb-2 border-b border-white/5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>7. Trạng Thái Kho & Nhãn</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                        <Form.Item
                            name="status"
                            label={<span className="text-xs font-semibold text-pink-200">Trạng Thái Kho</span>}
                        >
                            <Select
                                options={[
                                    { value: 'available', label: 'Đang Bán' },
                                    { value: 'reserved', label: 'Đang Giữ' },
                                    { value: 'sold', label: 'Đã Bán' },
                                    { value: 'hidden', label: 'Tạm Ẩn' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            name="isVerified"
                            valuePropName="checked"
                            label={<span className="text-xs font-semibold text-pink-200">Xác Thực Uy Tín</span>}
                        >
                            <Switch checkedChildren="Đã duyệt" unCheckedChildren="Chưa duyệt" />
                        </Form.Item>

                        <Form.Item
                            name="isFeatured"
                            valuePropName="checked"
                            label={<span className="text-xs font-semibold text-pink-200">Ghim Nổi Bật</span>}
                        >
                            <Switch checkedChildren="Nổi Bật" unCheckedChildren="Thường" />
                        </Form.Item>

                        <Form.Item
                            name="isHot"
                            valuePropName="checked"
                            label={<span className="text-xs font-semibold text-pink-200">Nick Hot Giờ Vàng</span>}
                        >
                            <Switch checkedChildren="Hot" unCheckedChildren="Thường" />
                        </Form.Item>
                    </div>
                </div>
            </Form>
        </Modal>
    );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import RichTextEditor from '@/components/admin/news/RichTextEditor';
import SeoPreviewBox from '@/components/admin/news/SeoPreviewBox';
import CategoryManagerDrawer from '@/components/admin/news/CategoryManagerDrawer';
import {
  ArrowLeft,
  Save,
  Send,
  Upload,
  Loader2,
  Sparkles,
  Pin,
  Globe,
  Tag as TagIcon,
  Image as ImageIcon,
  FolderTree,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  Form,
  Input,
  Select,
  Switch,
  DatePicker,
  Button,
  App,
  Card,
  Radio,
} from 'antd';
import { slugify } from '@/lib/utils';
import { NewsCategoryClientData } from '@/types/db-news';
import dayjs, { Dayjs } from 'dayjs';

export default function AdminCreateNewsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [categories, setCategories] = useState<NewsCategoryClientData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

  // Auto-slug tracking: If user manually edits slug, don't overwrite on title change
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Live form state for SEO preview & Content
  const [titleValue, setTitleValue] = useState('');
  const [slugValue, setSlugValue] = useState('');
  const [excerptValue, setExcerptValue] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [statusValue, setStatusValue] = useState<'draft' | 'published' | 'scheduled' | 'archived'>('draft');

  const [metaTitleValue, setMetaTitleValue] = useState('');
  const [metaDescValue, setMetaDescValue] = useState('');

  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/news/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh mục:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 2. Handle Title Change & Auto Slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleValue(val);
    if (!isSlugManuallyEdited) {
      const generated = slugify(val);
      setSlugValue(generated);
      form.setFieldValue('slug', generated);
    }
  };

  // 3. Handle Thumbnail Upload to Cloudfly S3
  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'news');

    try {
      setUploadingThumbnail(true);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setThumbnailUrl(data.url);
        form.setFieldValue('thumbnail', data.url);
        message.success('Tải ảnh đại diện lên Cloudfly S3 thành công!');
      } else {
        message.error(data.message || 'Tải ảnh đại diện thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải ảnh đại diện.');
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  // 4. Submit Form
  const onFinish = async (values: any) => {
    if (!contentHtml.trim()) {
      message.error('Vui lòng nhập nội dung bài viết.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: values.title,
        slug: slugify(values.slug || values.title),
        excerpt: values.excerpt || '',
        content: contentHtml,
        thumbnail: thumbnailUrl || values.thumbnail || '',
        categoryId: values.categoryId || undefined,
        tags: values.tags || [],
        status: values.status || 'draft',
        isFeatured: Boolean(values.isFeatured),
        isPinned: Boolean(values.isPinned),
        scheduledAt: values.scheduledAt ? dayjs(values.scheduledAt).toISOString() : null,
        metaTitle: values.metaTitle || values.title,
        metaDescription: values.metaDescription || values.excerpt || values.title,
        metaKeywords: values.metaKeywords || '',
        canonicalUrl: values.canonicalUrl || '',
        robots: values.robots || 'index, follow',
      };

      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        message.success('Tạo bài viết tin tức mới thành công!');
        router.push('/admin/news');
      } else {
        message.error(data.message || 'Tạo bài viết thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi gửi dữ liệu bài viết.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ADMIN HEADER */}
      <AdminPageHeader
        title="Thêm Bài Viết Tin Tức Mới"
        description="Tạo bài viết, hướng dẫn game, tin tức sự kiện với đầy đủ cấu hình nội dung và SEO."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/news"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-pink-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại</span>
            </Link>

            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={submitting}
              className="px-4 py-2 h-auto rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-lg shadow-rose-950/60 border-none flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Bài Viết</span>
            </Button>
          </div>
        }
      />

      {/* 2. MAIN FORM */}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          status: 'draft',
          isFeatured: false,
          isPinned: false,
          robots: 'index, follow',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (8 cols): Main Content, Title, Excerpt, Editor */}
          <div className="lg:col-span-8 space-y-6">
            {/* General Info Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#180917]/90 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Thông Tin Cơ Bản</span>
              </h3>

              {/* Title */}
              <Form.Item
                name="title"
                label={<span className="text-xs font-bold text-pink-200">Tiêu đề bài viết</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề bài viết' }]}
              >
                <Input
                  size="large"
                  placeholder="Ví dụ: Hướng dẫn nạp quân huy Liên Quân Mobile an toàn 2026..."
                  onChange={handleTitleChange}
                  className="bg-[#10030f] border-white/10 text-white font-bold"
                />
              </Form.Item>

              {/* Slug */}
              <Form.Item
                name="slug"
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-pink-200">Đường dẫn thân thiện SEO (Slug)</span>
                    <span className="text-[10px] text-pink-300/50">Tự động sinh từ tiêu đề</span>
                  </div>
                }
                rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
              >
                <Input
                  placeholder="huong-dan-nap-quan-huy-lien-quan-mobile"
                  value={slugValue}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setSlugValue(e.target.value);
                  }}
                  className="bg-[#10030f] border-white/10 text-white font-mono text-xs"
                />
              </Form.Item>

              {/* Excerpt */}
              <Form.Item
                name="excerpt"
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-pink-200">Mô tả tóm tắt (Excerpt)</span>
                    <span className="text-[10px] text-pink-300/50">{excerptValue.length}/250 ký tự</span>
                  </div>
                }
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Tóm tắt ngắn gọn nội dung bài viết trong 1-2 câu để thu hút người đọc..."
                  value={excerptValue}
                  onChange={(e) => setExcerptValue(e.target.value)}
                  className="bg-[#10030f] border-white/10 text-white text-xs"
                />
              </Form.Item>
            </div>

            {/* Rich HTML Content Editor Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#180917]/90 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Nội Dung Chi Tiết Bài Viết (HTML Editor)</span>
              </h3>

              <RichTextEditor
                value={contentHtml}
                onChange={(html) => setContentHtml(html)}
                placeholder="Soạn thảo nội dung bài viết, chèn ảnh, bảng biểu, liên kết..."
              />
            </div>

            {/* Live SEO Preview Box */}
            <SeoPreviewBox
              title={metaTitleValue || titleValue}
              slug={slugValue}
              description={metaDescValue || excerptValue}
            />

            {/* SEO Advanced Settings Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#180917]/90 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Globe className="w-4 h-4 text-rose-400" />
                <span>Cấu Hình SEO Nâng Cao</span>
              </h3>

              <div className="space-y-3">
                <Form.Item
                  name="metaTitle"
                  label={<span className="text-xs font-bold text-pink-200">Thẻ Tiêu Đề SEO (Meta Title)</span>}
                >
                  <Input
                    placeholder="Mặc định lấy theo tiêu đề bài viết..."
                    value={metaTitleValue}
                    onChange={(e) => setMetaTitleValue(e.target.value)}
                    className="bg-[#10030f] border-white/10 text-white"
                  />
                </Form.Item>

                <Form.Item
                  name="metaDescription"
                  label={<span className="text-xs font-bold text-pink-200">Thẻ Mô Tả SEO (Meta Description)</span>}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Mặc định lấy theo mô tả ngắn tóm tắt..."
                    value={metaDescValue}
                    onChange={(e) => setMetaDescValue(e.target.value)}
                    className="bg-[#10030f] border-white/10 text-white"
                  />
                </Form.Item>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Form.Item
                    name="metaKeywords"
                    label={<span className="text-xs font-bold text-pink-200">Từ Khóa SEO (Keywords)</span>}
                  >
                    <Input
                      placeholder="game, lien quan, shop acc, gia re..."
                      className="bg-[#10030f] border-white/10 text-white"
                    />
                  </Form.Item>

                  <Form.Item
                    name="robots"
                    label={<span className="text-xs font-bold text-pink-200">Thẻ Meta Robots</span>}
                  >
                    <Select
                      className="w-full custom-admin-select"
                      options={[
                        { value: 'index, follow', label: 'index, follow (Cho phép Google index)' },
                        { value: 'noindex, follow', label: 'noindex, follow' },
                        { value: 'noindex, nofollow', label: 'noindex, nofollow (Chặn bot tìm kiếm)' },
                      ]}
                    />
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (4 cols): Thumbnail, Category, Status, Tags, Publishing */}
          <div className="lg:col-span-4 space-y-6">
            {/* Publishing Controls Card */}
            <div className="p-5 rounded-3xl bg-[#180917]/90 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Send className="w-4 h-4 text-rose-400" />
                <span>Trạng Thái & Xuất Bản</span>
              </h3>

              {/* Status Select */}
              <Form.Item
                name="status"
                label={<span className="text-xs font-bold text-pink-200">Trạng thái bài viết</span>}
              >
                <Select
                  value={statusValue}
                  onChange={(v) => setStatusValue(v)}
                  className="w-full custom-admin-select"
                  options={[
                    { value: 'draft', label: 'Bản nháp (Draft)' },
                    { value: 'published', label: 'Xuất bản ngay (Published)' },
                    { value: 'scheduled', label: 'Lên lịch đăng (Scheduled)' },
                    { value: 'archived', label: 'Lưu trữ (Archived)' },
                  ]}
                />
              </Form.Item>

              {/* Scheduled Date Picker (Hiển thị khi status = 'scheduled') */}
              {statusValue === 'scheduled' && (
                <Form.Item
                  name="scheduledAt"
                  label={<span className="text-xs font-bold text-purple-300">Thời gian hẹn giờ xuất bản</span>}
                  rules={[{ required: true, message: 'Vui lòng chọn thời gian lên lịch' }]}
                >
                  <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    placeholder="Chọn ngày giờ đăng..."
                    className="w-full bg-[#10030f] border-white/10 text-white"
                  />
                </Form.Item>
              )}

              {/* Switches: Featured & Pinned */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Bài viết nổi bật</div>
                      <div className="text-[10px] text-pink-300/50">Hiển thị trong slider nổi bật</div>
                    </div>
                  </div>
                  <Form.Item name="isFeatured" valuePropName="checked" className="mb-0">
                    <Switch />
                  </Form.Item>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Ghim bài viết</div>
                      <div className="text-[10px] text-pink-300/50">Ưu tiên ghim trên đầu danh sách</div>
                    </div>
                  </div>
                  <Form.Item name="isPinned" valuePropName="checked" className="mb-0">
                    <Switch />
                  </Form.Item>
                </div>
              </div>

              {/* Submit CTA button */}
              <div className="pt-3 border-t border-white/10">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  className="w-full h-11 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-lg shadow-rose-950/60 border-none flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Hoàn Tất & Lưu Bài Viết</span>
                </Button>
              </div>
            </div>

            {/* Thumbnail Upload Card */}
            <div className="p-5 rounded-3xl bg-[#180917]/90 border border-white/10 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <ImageIcon className="w-4 h-4 text-rose-400" />
                <span>Ảnh Đại Diện (Thumbnail)</span>
              </h3>

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailFileChange}
              />

              {thumbnailUrl ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-xl group">
                    <Image
                      src={thumbnailUrl}
                      alt="Thumbnail preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                        title="Thay đổi ảnh"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailUrl('');
                          form.setFieldValue('thumbnail', '');
                        }}
                        className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-pink-300/50 text-center truncate font-mono">
                    {thumbnailUrl}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#1b071a] border border-dashed border-rose-500/40 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 mx-auto flex items-center justify-center">
                    {uploadingThumbnail ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={uploadingThumbnail}
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {uploadingThumbnail ? 'Đang tải lên S3...' : 'Tải ảnh đại diện lên'}
                    </button>
                  </div>
                  <p className="text-[11px] text-pink-300/50">Tỉ lệ khuyến nghị 16:9 hoặc 16:10 (JPG, PNG, WEBP).</p>
                </div>
              )}
            </div>

            {/* Category & Tags Card */}
            <div className="p-5 rounded-3xl bg-[#180917]/90 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-purple-400" />
                  <span>Chuyên Mục & Tags</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setCategoryDrawerOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Quản lý danh mục</span>
                </button>
              </div>

              {/* Category Select */}
              <Form.Item
                name="categoryId"
                label={<span className="text-xs font-bold text-pink-200">Chọn chuyên mục</span>}
              >
                <Select
                  placeholder="Chọn chuyên mục bài viết..."
                  className="w-full custom-admin-select"
                  allowClear
                  options={categories.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.articlesCount || 0} bài)`,
                  }))}
                />
              </Form.Item>

              {/* Tags */}
              <Form.Item
                name="tags"
                label={<span className="text-xs font-bold text-pink-200">Từ khóa bài viết (Tags)</span>}
              >
                <Select
                  mode="tags"
                  placeholder="Nhập từ khóa và ấn Enter..."
                  className="w-full custom-admin-select"
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </div>
          </div>
        </div>
      </Form>

      {/* CATEGORY DRAWER */}
      <CategoryManagerDrawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        onCategoryChange={fetchCategories}
      />
    </div>
  );
}

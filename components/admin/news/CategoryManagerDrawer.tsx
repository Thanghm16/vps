'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Switch,
  Modal,
  Popconfirm,
  App,
  Tag,
} from 'antd';
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { slugify } from '@/lib/utils';
import { NewsCategoryClientData } from '@/types/db-news';

interface CategoryManagerDrawerProps {
  open: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

export default function CategoryManagerDrawer({
  open,
  onClose,
  onCategoryChange,
}: CategoryManagerDrawerProps) {
  const { message } = App.useApp();
  const [categories, setCategories] = useState<NewsCategoryClientData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<NewsCategoryClientData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/news/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        message.error(data.message || 'Lỗi tải danh mục tin tức.');
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể kết nối máy chủ để lấy danh mục.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, fetchCategories]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingCat(null);
    form.resetFields();
    form.setFieldsValue({
      status: true,
      sortOrder: 0,
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (record: NewsCategoryClientData) => {
    setEditingCat(record);
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      status: record.status === 'active',
      sortOrder: record.sortOrder,
      metaTitle: record.metaTitle,
      metaDescription: record.metaDescription,
    });
    setModalOpen(true);
  };

  // Submit Category Form
  const handleSubmitForm = async (values: any) => {
    try {
      setSubmitting(true);
      const payload = {
        name: values.name,
        slug: values.slug ? slugify(values.slug) : slugify(values.name),
        description: values.description,
        status: values.status ? 'active' : 'inactive',
        sortOrder: values.sortOrder || 0,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
      };

      const url = editingCat
        ? `/api/admin/news/categories/${editingCat.id}`
        : '/api/admin/news/categories';
      const method = editingCat ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        message.success(data.message || (editingCat ? 'Cập nhật thành công!' : 'Tạo mới thành công!'));
        setModalOpen(false);
        fetchCategories();
        onCategoryChange?.();
      } else {
        message.error(data.message || 'Thao tác thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lưu danh mục.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/categories/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        message.success('Xóa danh mục tin tức thành công!');
        fetchCategories();
        onCategoryChange?.();
      } else {
        message.error(data.message || 'Không thể xóa danh mục.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa danh mục.');
    }
  };

  // Quick toggle status
  const handleToggleStatus = async (record: NewsCategoryClientData, checked: boolean) => {
    try {
      const res = await fetch(`/api/admin/news/categories/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: checked ? 'active' : 'inactive' }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Cập nhật trạng thái thành công!');
        fetchCategories();
        onCategoryChange?.();
      } else {
        message.error(data.message || 'Cập nhật trạng thái thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi đổi trạng thái.');
    }
  };

  // Filtered categories
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
  });

  const columns = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: NewsCategoryClientData) => (
        <div>
          <div className="font-bold text-white text-xs sm:text-sm">{text}</div>
          <div className="text-[11px] text-pink-300/60 font-mono">/{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Bài viết',
      dataIndex: 'articlesCount',
      key: 'articlesCount',
      width: 90,
      align: 'center' as const,
      render: (count: number) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-pink-200">
          {count || 0} bài
        </span>
      ),
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 70,
      align: 'center' as const,
      render: (num: number) => <span className="text-xs text-white/80 font-mono">{num || 0}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: any, record: NewsCategoryClientData) => (
        <Switch
          size="small"
          checked={record.status === 'active'}
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      align: 'right' as const,
      render: (_: any, record: NewsCategoryClientData) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleOpenEdit(record)}
            className="p-1.5 rounded-lg text-pink-300/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Chỉnh sửa"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <Popconfirm
            title="Xác nhận xóa danh mục?"
            description="Lưu ý: Không thể xóa nếu có bài viết đang thuộc danh mục này."
            onConfirm={() => handleDeleteCategory(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Xóa danh mục"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2 text-white font-bold">
          <FolderTree className="w-4 h-4 text-rose-400" />
          <span>Quản Lý Danh Mục Tin Tức</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={600}
      styles={{
        body: { background: '#110410', padding: '16px' },
        header: { background: '#180717', borderBottom: '1px solid rgba(255,255,255,0.08)' },
      }}
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-300/40" />
            <input
              type="text"
              placeholder="Tìm danh mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c081c] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-rose-500"
            />
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Danh Mục</span>
          </button>
        </div>

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredCategories}
          loading={loading}
          pagination={false}
          size="small"
          className="custom-admin-table"
        />
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        title={
          <span className="text-white font-bold">
            {editingCat ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Tin Tức Mới'}
          </span>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitForm} className="space-y-3 pt-2">
          <Form.Item
            name="name"
            label={<span className="text-xs text-pink-200">Tên danh mục</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
          >
            <Input
              placeholder="Ví dụ: Hướng Dẫn Game, Tin Sự Kiện..."
              onChange={(e) => {
                if (!editingCat) {
                  form.setFieldValue('slug', slugify(e.target.value));
                }
              }}
              className="bg-[#1d0a1b] border-white/10 text-white"
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label={<span className="text-xs text-pink-200">Đường dẫn Slug (URL)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
          >
            <Input placeholder="huong-dan-game" className="bg-[#1d0a1b] border-white/10 text-white font-mono text-xs" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="text-xs text-pink-200">Mô tả ngắn</span>}
          >
            <Input.TextArea
              rows={2}
              placeholder="Mô tả tóm tắt nội dung danh mục..."
              className="bg-[#1d0a1b] border-white/10 text-white"
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="sortOrder"
              label={<span className="text-xs text-pink-200">Thứ tự ưu tiên</span>}
            >
              <InputNumber min={0} style={{ width: '100%' }} className="w-full bg-[#1d0a1b] border-white/10 text-white" />
            </Form.Item>

            <Form.Item
              name="status"
              label={<span className="text-xs text-pink-200">Trạng thái</span>}
              valuePropName="checked"
            >
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="bg-rose-600 hover:bg-rose-500 font-bold"
            >
              {editingCat ? 'Cập Nhật' : 'Tạo Danh Mục'}
            </Button>
          </div>
        </Form>
      </Modal>
    </Drawer>
  );
}

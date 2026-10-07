'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminPageHeader from '@/components/admin/common/AdminPageHeader';
import { slugify } from '@/lib/utils';
import {
  PlusCircle,
  Edit,
  Trash2,
  Gamepad2,
  RefreshCw,
  Database,
  Sparkles,
} from 'lucide-react';
import { Table, Modal, Form, Input, App, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface GameCategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  accountsCount: number;
}

export default function AdminGamesPage() {
  const { message } = App.useApp();
  const [games, setGames] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameCategory | null>(null);
  const [slugPreview, setSlugPreview] = useState('');
  const [form] = Form.useForm();

  // Tải danh sách game từ MongoDB
  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/games');
      const data = await res.json();
      if (data.success && Array.isArray(data.games)) {
        setGames(data.games);
      } else {
        message.error(data.message || 'Không thể tải danh sách game.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const res = await fetch('/api/admin/games');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.games)) {
          setGames(data.games);
        }
      } catch (e) {
        console.error('Initial games load failed:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingGame(null);
    form.resetFields();
    setSlugPreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (game: GameCategory) => {
    setEditingGame(game);
    form.setFieldsValue({
      name: game.name,
    });
    setSlugPreview(game.slug);
    setIsModalOpen(true);
  };

  const handleDelete = async (gameId: string) => {
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa danh mục game!');
        fetchGames();
      } else {
        message.error(data.message || 'Xóa danh mục thất bại.');
      }
    } catch {
      message.error('Lỗi kết nối khi xóa danh mục.');
    }
  };

  // Tự động tính toán preview slug khi gõ tên
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSlugPreview(slugify(val));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingGame) {
        const res = await fetch(`/api/admin/games/${editingGame.id || editingGame._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name }),
        });
        const data = await res.json();
        if (data.success) {
          message.success('Cập nhật danh mục thành công!');
          setIsModalOpen(false);
          fetchGames();
        } else {
          message.error(data.message || 'Cập nhật thất bại.');
        }
      } else {
        const res = await fetch('/api/admin/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name }),
        });
        const data = await res.json();
        if (data.success) {
          message.success(data.message || 'Thêm danh mục game thành công!');
          setIsModalOpen(false);
          fetchGames();
        } else {
          message.error(data.message || 'Thêm thất bại.');
        }
      }
    } catch {
      // Form validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        fetchGames();
      } else {
        message.error(data.message || 'Lỗi khi khởi tạo dữ liệu.');
      }
    } catch {
      message.error('Lỗi máy chủ khi seed dữ liệu.');
    } finally {
      setSeeding(false);
    }
  };

  const columns: ColumnsType<GameCategory> = [
    {
      title: 'TỰA GAME',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-rose-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">{record.name}</div>
            <div className="text-[11px] text-pink-300/50 font-mono">ID: {record.id}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'ĐƯỜNG DẪN ĐỊNH DANH (SLUG SERVER TỰ TẠO)',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-pink-300">
          /{slug}
        </span>
      ),
    },
    {
      title: 'NICK TRONG KHO',
      dataIndex: 'accountsCount',
      key: 'accountsCount',
      render: (count: number) => (
        <span className="font-bold text-rose-400 text-xs bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
          {count || 0} nick khả dụng
        </span>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(record)}
            className="p-2 rounded-xl bg-white/5 hover:bg-purple-600/20 text-pink-200 hover:text-white transition border border-white/5"
            title="Chỉnh sửa danh mục"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          <Popconfirm
            title="Xác nhận xóa danh mục game này?"
            description="Lưu ý: Thao tác này sẽ xóa danh mục khỏi hệ thống."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-rose-400 transition border border-white/5"
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
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <AdminPageHeader
        title="Danh Mục Tựa Game"
        description="Quản lý các danh mục game trên sàn. Bạn chỉ cần nhập Tên Game, hệ thống sẽ tự động tạo URL Slug chuẩn trên Server."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchGames}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-pink-200 border border-white/10 transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {games.length === 0 && (
              <button
                type="button"
                onClick={handleSeedData}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-xs font-semibold text-purple-300 border border-purple-500/30 transition"
                title="Khởi tạo kho game mẫu"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{seeding ? 'Đang tạo...' : 'Gieo Dữ Liệu Mẫu'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm Danh Mục</span>
            </button>
          </div>
        }
      />

      {/* TABLE */}
      <div className="p-6 rounded-3xl bg-[#170616]/80 border border-white/5 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={games}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </div>
      </div>

      {/* MODAL THÊM / SỬA GAME (CHỈ CẦN TÊN, SLUG TỰ ĐỘNG TẠO TRÊN SERVER) */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingGame ? 'Lưu Thay Đổi' : 'Thêm Danh Mục'}
        cancelText="Hủy"
        width={480}
        title={
          <span className="text-white font-bold text-base">
            {editingGame ? `Sửa Danh Mục: ${editingGame.name}` : 'Thêm Danh Mục Game Mới'}
          </span>
        }
        styles={{
          body: {
            background: '#180a17',
            padding: '1.25rem',
          },
          header: {
            background: '#1a0a19',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Form form={form} layout="vertical" className="space-y-4 pt-2">
          <Form.Item
            name="name"
            label={<span className="text-xs font-semibold text-pink-200">Tên Danh Mục Game</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên game!' }]}
          >
            <Input
              placeholder="VD: Genshin Impact, Honkai Star Rail, Roblox..."
              onChange={handleNameChange}
              size="large"
              autoFocus
              className="bg-black/30 border-white/10 text-white rounded-xl"
            />
          </Form.Item>

          {/* PREVIEW SLUG TỰ ĐỘNG */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Slug URL (Server tự tạo):</span>
            </div>
            <span className="font-mono font-bold text-pink-300">
              /{slugPreview || '...'}
            </span>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

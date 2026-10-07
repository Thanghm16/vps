'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  CodeXml,
  Undo,
  Redo,
  Upload,
  Loader2,
  Eye,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { Modal, Input, Button, App, Tooltip } from 'antd';
import { calculateReadingTime, extractPlainText } from '@/lib/security/html-sanitizer';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết tại đây...',
}: RichTextEditorProps) {
  const { message } = App.useApp();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Link Modal State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Table Modal State
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Synchronize initial content to contentEditable
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      if (!isSourceMode) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isSourceMode]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceCode(html);
    }
  }, [onChange]);

  const execCmd = (cmd: string, val: string = '') => {
    if (isSourceMode) return;
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  // Format heading
  const formatBlock = (tag: string) => {
    execCmd('formatBlock', `<${tag}>`);
  };

  // Link insertion
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
      ? linkUrl
      : `https://${linkUrl}`;

    if (linkText.trim()) {
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`;
      execCmd('insertHTML', linkHtml);
    } else {
      execCmd('createLink', url);
    }
    setLinkModalOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Direct Image Upload to Cloudfly S3 via /api/admin/upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'news');

    try {
      setUploadingImage(true);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        const alt = imageAlt.trim() || file.name.replace(/\.[^/.]+$/, '');
        const imgHtml = `<figure class="my-6"><img src="${data.url}" alt="${alt}" class="rounded-2xl shadow-xl w-full max-h-[500px] object-cover mx-auto" /><figcaption class="text-center text-xs text-pink-300/60 mt-2 italic">${alt}</figcaption></figure><p><br/></p>`;
        execCmd('insertHTML', imgHtml);
        message.success('Chèn ảnh bài viết lên S3 thành công!');
        setImageModalOpen(false);
        setImageUrl('');
        setImageAlt('');
      } else {
        message.error(data.message || 'Tải ảnh thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải ảnh bài viết.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Image insertion via URL
  const handleInsertImageUrl = () => {
    if (!imageUrl.trim()) return;
    const alt = imageAlt.trim() || 'Hình ảnh bài viết';
    const imgHtml = `<figure class="my-6"><img src="${imageUrl.trim()}" alt="${alt}" class="rounded-2xl shadow-xl w-full max-h-[500px] object-cover mx-auto" /><figcaption class="text-center text-xs text-pink-300/60 mt-2 italic">${alt}</figcaption></figure><p><br/></p>`;
    execCmd('insertHTML', imgHtml);
    setImageModalOpen(false);
    setImageUrl('');
    setImageAlt('');
  };

  // Table insertion
  const handleInsertTable = () => {
    const rows = Math.max(1, Math.min(10, tableRows));
    const cols = Math.max(1, Math.min(10, tableCols));

    let tableHtml = '<table class="w-full my-4 border-collapse border border-white/10 rounded-xl overflow-hidden">';
    // Header
    tableHtml += '<thead><tr>';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th class="bg-[#210920] p-3 text-left font-bold text-white border border-white/10">Cột ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    // Rows
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td class="p-3 border border-white/10 text-pink-100/80">Dữ liệu ${r}-${c}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br/></p>';

    execCmd('insertHTML', tableHtml);
    setTableModalOpen(false);
  };

  const handleToggleSource = () => {
    if (isSourceMode) {
      // Switching from raw HTML to Visual Editor
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceCode;
      }
      onChange(sourceCode);
      setIsSourceMode(false);
    } else {
      // Switching to raw HTML
      const current = editorRef.current ? editorRef.current.innerHTML : value;
      setSourceCode(current);
      setIsSourceMode(true);
    }
  };

  const currentText = isSourceMode ? sourceCode : (editorRef.current?.innerHTML || value || '');
  const wordCount = extractPlainText(currentText).split(/\s+/).filter(Boolean).length;
  const readingTime = calculateReadingTime(currentText);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#140513] overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-[#110410] border-rose-500/40' : 'w-full min-h-[420px]'
      }`}
    >
      {/* 1. EDITOR TOOLBAR */}
      <div className="p-2 border-b border-white/10 bg-[#1c081c]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-1 select-none">
        <div className="flex flex-wrap items-center gap-1">
          {/* History */}
          <button
            type="button"
            onClick={() => execCmd('undo')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Hoàn tác (Undo)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('redo')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Làm lại (Redo)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-white/10 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => formatBlock('p')}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đoạn văn thường (Paragraph)"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => formatBlock('h2')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tiêu đề H2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatBlock('h3')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tiêu đề H3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatBlock('h4')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tiêu đề H4"
          >
            <Heading4 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-white/10 mx-1" />

          {/* Formatting */}
          <button
            type="button"
            onClick={() => execCmd('bold')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="In đậm (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('italic')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="In nghiêng (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('underline')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Gạch chân (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Gạch ngang chữ"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-white/10 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => execCmd('justifyLeft')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Căn trái"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyCenter')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Căn giữa"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyRight')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Căn phải"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyFull')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Căn đều 2 bên"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-white/10 mx-1" />

          {/* Lists & Blocks */}
          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Danh sách không thứ tự"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Danh sách có thứ tự"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatBlock('blockquote')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Trích dẫn (Quote)"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatBlock('pre')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Khối Code (Pre)"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertHorizontalRule')}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đường kẻ ngang (HR)"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-white/10 mx-1" />

          {/* Media & Links */}
          <button
            type="button"
            onClick={() => setLinkModalOpen(true)}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Chèn liên kết"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center gap-1"
            title="Chèn hoặc tải ảnh lên bài viết"
          >
            <ImageIcon className="w-4 h-4 text-rose-400" />
          </button>
          <button
            type="button"
            onClick={() => setTableModalOpen(true)}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Chèn bảng dữ liệu (Table)"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Right tools: Source View, Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSource}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              isSourceMode
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-pink-200/70 hover:text-white hover:bg-white/10'
            }`}
            title="Chuyển đổi xem mã nguồn HTML"
          >
            <CodeXml className="w-3.5 h-3.5" />
            <span>HTML</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-pink-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN EDITING CANVAS */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[360px] bg-[#10030f]">
        {isSourceMode ? (
          <textarea
            value={sourceCode}
            onChange={(e) => {
              setSourceCode(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Dán hoặc nhập mã HTML bài viết tại đây..."
            className="w-full h-full min-h-[360px] bg-transparent text-emerald-400 font-mono text-xs sm:text-sm p-2 outline-none resize-none"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            className="outline-none min-h-[360px] text-pink-100/90 text-sm sm:text-base leading-relaxed prose prose-invert max-w-none 
              prose-headings:text-white prose-headings:font-black
              prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-rose-300
              prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-pink-200
              prose-p:mb-4
              prose-a:text-rose-400 prose-a:underline
              prose-blockquote:border-l-4 prose-blockquote:border-rose-500 prose-blockquote:bg-rose-950/20 prose-blockquote:p-3 prose-blockquote:rounded-r-xl prose-blockquote:italic
              prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-img:shadow-xl prose-img:my-4
              prose-pre:bg-[#180617] prose-pre:p-3 prose-pre:rounded-xl prose-pre:font-mono prose-pre:text-xs"
            data-placeholder={placeholder}
          />
        )}
      </div>

      {/* 3. FOOTER INFO STATUS BAR */}
      <div className="px-4 py-2 border-t border-white/10 bg-[#170516] flex items-center justify-between text-xs text-pink-300/60 font-medium">
        <div className="flex items-center gap-4">
          <span>
            Số từ: <strong className="text-white">{wordCount}</strong>
          </span>
          <span>
            Thời gian đọc ước tính: <strong className="text-white">~{readingTime} phút</strong>
          </span>
        </div>
        <div className="text-[11px] text-pink-300/40">
          Hỗ trợ phím tắt: Ctrl+B (Đậm), Ctrl+I (Nghiêng), Ctrl+U (Gạch chân)
        </div>
      </div>

      {/* 4. INSERT LINK MODAL */}
      <Modal
        title={<span className="text-white font-bold">Chèn Liên Kết (Link)</span>}
        open={linkModalOpen}
        onOk={handleInsertLink}
        onCancel={() => setLinkModalOpen(false)}
        okText="Chèn Link"
        cancelText="Hủy"
      >
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-pink-200/80 block mb-1">Địa chỉ URL:</label>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="bg-[#1d0a1b] border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-pink-200/80 block mb-1">Văn bản hiển thị (Tùy chọn):</label>
            <Input
              placeholder="Nhấn vào đây để xem..."
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="bg-[#1d0a1b] border-white/10 text-white"
            />
          </div>
        </div>
      </Modal>

      {/* 5. INSERT IMAGE MODAL (UPLOAD S3 & URL) */}
      <Modal
        title={<span className="text-white font-bold">Chèn Hình Ảnh Bài Viết</span>}
        open={imageModalOpen}
        onCancel={() => setImageModalOpen(false)}
        footer={null}
      >
        <div className="space-y-4 py-2">
          {/* Direct Upload to S3 */}
          <div className="p-4 rounded-2xl bg-[#1b071a] border border-dashed border-rose-500/40 text-center space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 mx-auto flex items-center justify-center">
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </div>
            <div>
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {uploadingImage ? 'Đang tải lên Cloudfly S3...' : 'Tải ảnh từ máy tính'}
              </button>
            </div>
            <p className="text-[11px] text-pink-300/50">Hỗ trợ JPG, PNG, WEBP, GIF tối đa 10MB.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-xs text-pink-300/40">HOẶC DÙNG ĐƯỜNG DẪN ẢNH</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* URL Input */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-pink-200/80 block mb-1">URL Hình ảnh:</label>
              <Input
                placeholder="https://domain.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-[#1d0a1b] border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-pink-200/80 block mb-1">Chú thích / Alt text:</label>
              <Input
                placeholder="Mô tả hình ảnh..."
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className="bg-[#1d0a1b] border-white/10 text-white"
              />
            </div>
            <Button
              type="primary"
              onClick={handleInsertImageUrl}
              disabled={!imageUrl.trim()}
              className="w-full bg-rose-600 hover:bg-rose-500 font-bold"
            >
              Chèn Bằng Link URL
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. INSERT TABLE MODAL */}
      <Modal
        title={<span className="text-white font-bold">Chèn Bảng Dữ Liệu</span>}
        open={tableModalOpen}
        onOk={handleInsertTable}
        onCancel={() => setTableModalOpen(false)}
        okText="Chèn Bảng"
        cancelText="Hủy"
      >
        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <label className="text-xs text-pink-200/80 block mb-1">Số hàng (Rows):</label>
            <Input
              type="number"
              min={1}
              max={15}
              value={tableRows}
              onChange={(e) => setTableRows(Number(e.target.value) || 3)}
              className="bg-[#1d0a1b] border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-pink-200/80 block mb-1">Số cột (Cols):</label>
            <Input
              type="number"
              min={1}
              max={8}
              value={tableCols}
              onChange={(e) => setTableCols(Number(e.target.value) || 3)}
              className="bg-[#1d0a1b] border-white/10 text-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsCard from '@/components/news/NewsCard';
import {
  Search,
  Sparkles,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PackageOpen,
  X,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { NewsClientData, NewsCategoryClientData } from '@/types/db-news';
import { NewsInitialData } from '@/lib/db/news-page';

interface NewsClientViewProps {
  initialData: NewsInitialData;
}

export default function NewsClientView({ initialData }: NewsClientViewProps) {
  const [articles, setArticles] = useState<NewsClientData[]>(initialData.initialArticles);
  const [featuredArticles] = useState<NewsClientData[]>(initialData.featuredArticles);
  const [categories] = useState<NewsCategoryClientData[]>(initialData.categories);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(initialData.totalArticles);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [loading, setLoading] = useState(false);

  // Fetch News with Filters (chỉ gọi khi user filter / search / paginate)
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.articles)) {
        setArticles(data.articles);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setArticles([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedCategory, debouncedSearch]);

  // Chỉ trigger fetch khi state khác với initial load
  const isInitialState = page === 1 && selectedCategory === 'all' && !debouncedSearch.trim();

  useEffect(() => {
    if (!isInitialState) {
      fetchArticles();
    }
  }, [fetchArticles, isInitialState]);

  const handleSelectCategory = (slug: string) => {
    setSelectedCategory(slug);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  // Pagination generator
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#0c040b] text-[#fdf2f8] flex flex-col selection:bg-rose-500 selection:text-white">
      {/* HEADER */}
      <Header />

      {/* TOP HERO & SEARCH BANNER */}
      <section className="relative w-full py-10 sm:py-14 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-gradient-to-b from-[#1c071b]/90 via-[#140614]/70 to-[#0c040b] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-pink-300/60 mb-3">
            <Link href="/" className="hover:text-rose-400 transition">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Tin Tức & Hướng Dẫn Game</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Tin Tức &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400">
              Cẩm Nang Game VIP
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-pink-200/70 max-w-2xl mt-2.5 leading-relaxed">
            Cập nhật tin tức game mới nhất, hướng dẫn build đồ, mẹo leo rank, phân tích meta và cẩm nang giao dịch tài
            khoản an toàn 100%.
          </p>

          {/* Search Box */}
          <div className="w-full max-w-2xl mt-6 relative">
            <div className="relative flex items-center rounded-2xl bg-[#1e0a1d]/90 border-2 border-rose-500/30 focus-within:border-rose-500 shadow-xl shadow-black/50 transition-all p-1 sm:p-1.5 backdrop-blur-xl">
              <div className="pl-3 sm:pl-4 pr-2 text-rose-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm bài viết, hướng dẫn, mẹo leo rank..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none placeholder:text-pink-300/40 px-2 py-2"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="p-1.5 rounded-full hover:bg-white/10 text-pink-300/50 hover:text-white mr-1.5 transition cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* CATEGORIES PILLS BAR */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-950/50 scale-105'
                  : 'bg-[#1b081a] hover:bg-white/10 text-pink-200/80 border border-white/5'
              }`}
            >
              Tất Cả Tin Tức
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-950/50 scale-105'
                      : 'bg-[#1b081a] hover:bg-white/10 text-pink-200/80 border border-white/5'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.articlesCount ? (
                    <span className="text-[10px] opacity-70">({cat.articlesCount})</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* FEATURED ARTICLES HERO */}
        {page === 1 && !debouncedSearch && featuredArticles.length > 0 && selectedCategory === 'all' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Bài Viết Nổi Bật & Tiêu Điểm
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {featuredArticles.map((art) => (
                <NewsCard key={art.id || art.slug} article={art} featured />
              ))}
            </div>
          </section>
        )}

        {/* LATEST NEWS SECTION */}
        <section className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {selectedCategory === 'all'
                  ? 'Danh Sách Tin Tức Mới Nhất'
                  : `Chuyên Mục: ${categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}`}
              </h2>
            </div>

            <div className="text-xs text-pink-300/60 font-medium">
              Tìm thấy <strong className="text-white">{totalCount}</strong> bài viết
            </div>
          </div>

          {/* LOADING SKELETON */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-[#180817]/80 border border-white/5 p-4 space-y-3.5 animate-pulse"
                >
                  <div className="w-full aspect-[16/10] rounded-2xl bg-white/8" />
                  <div className="h-4 bg-white/10 rounded-lg w-4/5" />
                  <div className="h-3 bg-white/5 rounded-lg w-3/5" />
                  <div className="h-3 bg-white/5 rounded-lg w-1/2 pt-2" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            /* EMPTY STATE */
            <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-[#180917]/50 border border-white/5 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#280e25] flex items-center justify-center text-pink-300/40">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Chưa có bài viết nào
              </h3>
              <p className="text-xs text-pink-200/60 max-w-md">
                Chưa có bài viết nào trong chuyên mục này hoặc không tìm thấy bài viết phù hợp với từ khóa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSelectedCategory('all');
                }}
                className="px-5 py-2.5 rounded-xl btn-gradient-hero text-white text-xs font-bold shadow-md cursor-pointer mt-2"
              >
                Xem tất cả tin tức
              </button>
            </div>
          ) : (
            /* ARTICLES GRID */
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {articles.map((art) => (
                  <NewsCard key={art.id || art.slug} article={art} />
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#180917]/80 border border-white/5 shadow-lg mt-6">
                  <div className="text-xs text-pink-200/60 font-medium">
                    Hiển thị <strong>{articles.length}</strong> / <strong>{totalCount}</strong> bài viết • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {/* First Page */}
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(1)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 cursor-pointer"
                      title="Trang đầu"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Prev Page */}
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-xs font-semibold text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Trước</span>
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((pNum, idx) => {
                      if (pNum === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-xs text-pink-300/40">
                            ...
                          </span>
                        );
                      }

                      const isCurrent = pNum === page;
                      return (
                        <button
                          key={`page-${pNum}`}
                          type="button"
                          onClick={() => handlePageChange(Number(pNum))}
                          className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            isCurrent
                              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30'
                              : 'bg-white/5 hover:bg-white/10 text-pink-200 hover:text-white border border-white/5'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    {/* Next Page */}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/20 text-xs font-semibold text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(totalPages)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-pink-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition border border-white/5 cursor-pointer"
                      title="Trang cuối"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

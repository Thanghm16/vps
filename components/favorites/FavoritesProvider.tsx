'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { App } from 'antd';

interface FavoritesContextType {
  favoriteCodes: string[];
  favoritesCount: number;
  isLoading: boolean;
  isFavorite: (code: string) => boolean;
  toggleFavorite: (accountOrCode: { code: string; title?: string; id?: string } | string) => Promise<boolean>;
  addFavorite: (accountOrCode: { code: string; title?: string; id?: string } | string) => Promise<boolean>;
  removeFavorite: (code: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Tải danh sách toàn bộ mã nick đã yêu thích của user từ backend
  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteCodes([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/favorites/ids', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.codes)) {
        setFavoriteCodes(data.codes.map((c: string) => c.toUpperCase()));
      }
    } catch (e) {
      console.warn('Could not sync favorites with backend:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  // Fast Set lookup
  const codesSet = useMemo(() => {
    return new Set(favoriteCodes.map((c) => c.toUpperCase()));
  }, [favoriteCodes]);

  const isFavorite = useCallback(
    (code: string) => {
      if (!code) return false;
      return codesSet.has(code.toUpperCase());
    },
    [codesSet]
  );

  // 2. Thêm vào yêu thích
  const addFavorite = useCallback(
    async (target: { code: string; title?: string; id?: string } | string): Promise<boolean> => {
      if (!user) {
        message.warning('Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích!');
        return false;
      }

      const code = typeof target === 'string' ? target : target.code;
      const cleanCode = code.toUpperCase();

      if (codesSet.has(cleanCode)) {
        return true;
      }

      // Optimistic update
      setFavoriteCodes((prev) => [...prev, cleanCode]);

      try {
        const payload = typeof target === 'string' ? { code } : { code: target.code, accountId: target.id };
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          message.success(`Đã lưu nick ${cleanCode} vào danh sách yêu thích!`);
          return true;
        } else {
          // Revert if failed
          setFavoriteCodes((prev) => prev.filter((c) => c !== cleanCode));
          message.error(data.message || 'Không thể lưu vào danh sách yêu thích.');
          return false;
        }
      } catch (err) {
        setFavoriteCodes((prev) => prev.filter((c) => c !== cleanCode));
        message.error('Lỗi kết nối máy chủ.');
        return false;
      }
    },
    [user, codesSet, message]
  );

  // 3. Bỏ yêu thích
  const removeFavorite = useCallback(
    async (code: string): Promise<boolean> => {
      if (!user) {
        message.warning('Vui lòng đăng nhập.');
        return false;
      }

      const cleanCode = code.toUpperCase();
      if (!codesSet.has(cleanCode)) {
        return true;
      }

      // Optimistic update
      setFavoriteCodes((prev) => prev.filter((c) => c !== cleanCode));

      try {
        const res = await fetch(`/api/favorites/${encodeURIComponent(cleanCode)}`, {
          method: 'DELETE',
        });
        const data = await res.json();

        if (data.success) {
          message.info(`Đã bỏ nick ${cleanCode} khỏi danh sách yêu thích.`);
          return true;
        } else {
          // Revert if failed
          setFavoriteCodes((prev) => [...prev, cleanCode]);
          message.error(data.message || 'Lỗi khi xóa khỏi danh sách yêu thích.');
          return false;
        }
      } catch (err) {
        setFavoriteCodes((prev) => [...prev, cleanCode]);
        message.error('Lỗi kết nối máy chủ.');
        return false;
      }
    },
    [user, codesSet, message]
  );

  // 4. Toggle Yêu thích (Bấm lần 1: Thêm, Bấm lần 2: Bỏ)
  const toggleFavorite = useCallback(
    async (target: { code: string; title?: string; id?: string } | string): Promise<boolean> => {
      const code = typeof target === 'string' ? target : target.code;
      const cleanCode = code.toUpperCase();

      if (codesSet.has(cleanCode)) {
        return removeFavorite(cleanCode);
      } else {
        return addFavorite(target);
      }
    },
    [codesSet, addFavorite, removeFavorite]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteCodes,
        favoritesCount: favoriteCodes.length,
        isLoading,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        refreshFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

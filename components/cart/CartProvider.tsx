'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GameAccount } from '@/types/account';
import { message } from 'antd';

interface CartContextType {
  items: GameAccount[];
  cartCount: number;
  isCartOpen: boolean;
  addToCart: (account: GameAccount) => void;
  removeFromCart: (code: string) => void;
  clearCart: () => void;
  isInCart: (code: string) => boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'gamestore_user_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<GameAccount[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore JSON parse error
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // ignore quota error
      }
    }
  }, [items, isHydrated]);

  const isInCart = useCallback(
    (code: string) => {
      const cleanCode = code.toUpperCase();
      return items.some((item) => item.code.toUpperCase() === cleanCode);
    },
    [items]
  );

  const addToCart = useCallback(
    (account: GameAccount) => {
      const cleanCode = account.code.toUpperCase();
      setItems((prev) => {
        const exists = prev.some((item) => item.code.toUpperCase() === cleanCode);
        if (exists) {
          message.info(`Nick ${account.code} đã có trong giỏ hàng.`);
          return prev;
        }
        message.success(`Đã thêm ${account.code} vào giỏ hàng!`);
        return [...prev, account];
      });
    },
    []
  );

  const removeFromCart = useCallback((code: string) => {
    const cleanCode = code.toUpperCase();
    setItems((prev) => {
      const filtered = prev.filter((item) => item.code.toUpperCase() !== cleanCode);
      message.info(`Đã bỏ nick ${code} khỏi giỏ hàng.`);
      return filtered;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    message.info('Đã làm trống giỏ hàng.');
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount: items.length,
        isCartOpen,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

'use client';

import React from 'react';
import Image from 'next/image';
import { GameAccount } from '@/types/account';
import { formatPrice } from '@/lib/utils';
import { Drawer } from 'antd';
import { X, Trash2, ShoppingCart, Zap, ArrowRight } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

interface CartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  items?: GameAccount[];
  onRemoveItem?: (code: string) => void;
  onCheckout: (account: GameAccount) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items: propsItems,
  onRemoveItem: propsRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const cart = useCart();

  const open = isOpen !== undefined ? isOpen : cart.isCartOpen;
  const handleClose = onClose || cart.closeCart;
  const items = propsItems !== undefined ? propsItems : cart.items;
  const handleRemoveItem = propsRemoveItem || cart.removeFromCart;

  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      placement="right"
      size={420}
      closeIcon={<X className="w-5 h-5 text-pink-300 hover:text-white" />}
      styles={{
        body: {
          backgroundColor: '#150714',
          padding: '1.25rem',
          color: '#fdf2f8',
        },
        header: {
          backgroundColor: '#1a0919',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      }}
      title={
        <div className="flex items-center justify-between text-white w-full pr-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-rose-500" />
            <span className="font-bold text-sm">Giỏ Hàng Tài Khoản ({items.length})</span>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={cart.clearCart}
              className="text-[11px] text-pink-400/60 hover:text-rose-400 transition"
            >
              Làm trống
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col justify-between h-full">
        {items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#240e21] flex items-center justify-center text-pink-300/40 mb-3 border border-white/5">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-white">Giỏ hàng đang trống</h4>
            <p className="text-xs text-pink-200/50 mt-1 max-w-xs">
              Bạn chưa thêm nick game nào vào danh sách chọn mua.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id || item.code}
                className="p-3 rounded-2xl bg-[#200d1e] border border-white/5 flex items-center justify-between gap-3 group hover:border-rose-500/30 transition"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                  <Image src={item.thumbnail} alt="" fill className="object-cover" sizes="56px" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <div className="text-[10px] text-pink-300/60 font-mono mt-0.5">
                    {item.code} • {item.gameName}
                  </div>
                  <div className="text-xs font-black text-rose-400 mt-1">
                    {formatPrice(item.price)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onCheckout(item);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 !text-white text-[11px] font-bold shadow-sm hover:scale-105 transition cursor-pointer"
                    style={{ color: '#ffffff' }}
                    title="Mua ngay nick này"
                  >
                    Mua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.code)}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                    aria-label="Xóa nick khỏi giỏ"
                    title="Xóa khỏi giỏ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-pink-200/70">Tổng cộng ({items.length} nick):</span>
              <span className="text-lg font-black text-rose-400">{formatPrice(totalPrice)}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                handleClose();
                if (items[0]) onCheckout(items[0]);
              }}
              className="w-full py-3 rounded-full btn-gradient-hero text-xs font-bold !text-white shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <Zap className="w-4 h-4 !text-white" />
              <span className="!text-white font-bold">Thanh Toán Nick Đầu Tiên ({formatPrice(items[0]?.price || 0)})</span>
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

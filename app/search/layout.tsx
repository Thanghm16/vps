import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tìm Kiếm & Lọc Nick Game Theo Yêu Cầu',
  description: 'Công cụ tìm kiếm và lọc nick game Liên Quân, Free Fire, Valorant, PUBG, FC Online theo giá, rank, tướng, skin nhanh chóng.',
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

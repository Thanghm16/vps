import { ObjectId } from 'mongodb';

export type NewsStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type NewsCategoryStatus = 'active' | 'inactive';

export interface NewsAuthorInfo {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
}

export interface NewsCategoryDocument {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: NewsCategoryStatus;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsCategoryClientData {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: NewsCategoryStatus;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  articlesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsDocument {
  _id?: ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML content (sanitized)
  thumbnail: string;
  images?: string[];
  categoryId?: ObjectId;
  categorySlug?: string;
  categoryName?: string;
  tags: string[];
  author: NewsAuthorInfo;
  status: NewsStatus;
  isFeatured: boolean;
  isPinned: boolean;
  views: number;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[] | string;
  canonicalUrl?: string;
  robots?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsClientData {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  thumbnail: string;
  images?: string[];
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  tags: string[];
  author: NewsAuthorInfo;
  status: NewsStatus;
  isFeatured: boolean;
  isPinned: boolean;
  views: number;
  publishedAt: string | null;
  scheduledAt: string | null;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[] | string;
  canonicalUrl?: string;
  robots?: string;
  readingTime?: number; // estimated minutes
  createdAt: string;
  updatedAt: string;
}

export interface NewsFormValues {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  thumbnail?: string;
  images?: string[];
  categoryId?: string;
  tags?: string[];
  status: NewsStatus;
  isFeatured?: boolean;
  isPinned?: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  robots?: string;
}

import { ObjectId } from 'mongodb';

export interface BannerImage {
  url: string;
  publicId?: string; // S3 Object key hoặc Cloudfly key
}

export interface BannerDocument {
  _id?: ObjectId;
  title: string;
  subtitle?: string;
  desktopImage: BannerImage;
  mobileImage?: BannerImage;
  buttonText?: string;
  link?: string;
  openInNewTab?: boolean;
  sortOrder: number;
  isActive: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  clickCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BannerScheduleStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export interface BannerClientData {
  id: string;
  _id?: string;
  title: string;
  subtitle?: string;
  desktopImage: BannerImage;
  mobileImage?: BannerImage;
  imageUrl?: string;
  buttonText?: string;
  ctaText?: string;
  link?: string;
  openInNewTab?: boolean;
  sortOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  startDate?: string;
  endDate?: string;
  scheduleStatus?: BannerScheduleStatus;
  clickCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    title: string;
    subtitle: string;
    desktopImage: BannerImage;
    mobileImage?: BannerImage;
    buttonText: string;
    link: string;
    openInNewTab: boolean;
    sortOrder: number;
    isActive: boolean;
    startAt: Date | null;
    endAt: Date | null;
  };
}

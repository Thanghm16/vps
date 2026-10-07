export type AdminRole = 'administrator' | 'manager' | 'staff';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: AdminRole;
  lastLogin: string;
}

export interface DashboardStats {
  revenueToday: number;
  revenueGrowth: number; // percentage, e.g. +18.4
  ordersToday: number;
  ordersDiff: number; // e.g. +8
  accountsOnSale: number;
  accountsSold: number;
  newCustomers: number;
  customerGrowth: number; // e.g. +12.5
  pendingTransactions: number;
}

export interface RevenueChartPoint {
  label: string; // e.g., 'T2', '01/05', 'Tháng 1'
  revenue: number; // VND
  orders: number;
}

export interface GameSalesMetric {
  gameId: string;
  gameName: string;
  accountsSold: number;
  revenue: number;
  percentage: number;
  badgeColor: string;
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled';
export type PaymentMethod = 'vietqr' | 'momo' | 'zalopay' | 'card' | 'wallet';

export interface AdminOrder {
  id: string;
  code: string; // e.g. #ORD-10291
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  accountCode: string; // e.g. #LQ10291
  accountThumbnail: string;
  gameId: string;
  gameName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentCode?: string;
  status: OrderStatus;
  createdAt: string;
  deliveryCredentials?: {
    username: string;
    password: string;
    note: string;
  };
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  vipLevel: 'VIP 1' | 'VIP 2' | 'VIP 3' | 'VIP 4' | 'VIP Kim Cương';
  totalSpent: number;
  ordersCount: number;
  status: 'active' | 'locked';
  registeredAt: string;
}

export interface AdminTransaction {
  id: string;
  code: string; // e.g. #TXN-90218
  orderCode?: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: 'success' | 'pending' | 'failed';
  time: string;
  bankReference?: string;
}

export interface AdminGameCategory {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string;
  accountsCount: number;
  sortOrder: number;
  status: 'active' | 'inactive';
  description: string;
}

export interface AdminBanner {
  id: string;
  _id?: string;
  title: string;
  subtitle?: string;
  desktopImage?: {
    url: string;
    publicId?: string;
  };
  mobileImage?: {
    url: string;
    publicId?: string;
  };
  imageUrl?: string; // Legacy fallback
  buttonText?: string;
  ctaText?: string; // Legacy fallback
  link?: string;
  openInNewTab?: boolean;
  sortOrder: number;
  isActive?: boolean;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  startAt?: string | null;
  endAt?: string | null;
  startDate?: string;
  endDate?: string;
  clickCount?: number;
  gameTag?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  status: 'active' | 'expired' | 'disabled';
}

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  folder?: string;
}

export interface BankAccountConfig {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isDefault: boolean;
  active: boolean;
  vaMode: 'all' | 'specific';
  useMainAccount: boolean;
  virtualAccounts: {
    id: string;
    code: string;
    name: string;
    type: 'official' | 'content';
    active: boolean;
  }[];
}

export interface SePayConfig {
  apiKey: string;
  webhookUrl?: string;
  autoApprove: boolean;
  depositPrefix: string;
  buyPrefix: string;
  active: boolean;
}

export interface AdminSettings {
  storeName: string;
  storeSlogan: string;
  hotline: string;
  supportEmail: string;
  address: string;
  defaultWarrantyDays: number;
  autoDelivery: boolean;
  maintenanceMode: boolean;
  minDepositAmount: number;
  announcement: string;
  s3?: S3StorageConfig;
  payment?: {
    sepayApiKey?: string;
    sepayActive?: boolean;
    momoPartnerCode?: string;
    momoActive?: boolean;
    depositPrefix?: string;
    buyPrefix?: string;
    bankAccounts?: BankAccountConfig[];
  };
}

export interface SystemSettingsDocument {
  _id?: import('mongodb').ObjectId;
  key: string; // 'system_settings'
  storeName: string;
  storeSlogan: string;
  hotline: string;
  supportEmail: string;
  address: string;
  defaultWarrantyDays: number;
  autoDelivery: boolean;
  maintenanceMode: boolean;
  minDepositAmount: number;
  announcement: string;
  s3: S3StorageConfig;
  payment?: {
    sepayApiKey?: string;
    sepayActive?: boolean;
    momoPartnerCode?: string;
    momoActive?: boolean;
    depositPrefix?: string;
    buyPrefix?: string;
    bankAccounts?: BankAccountConfig[];
  };
  updatedAt: Date;
}


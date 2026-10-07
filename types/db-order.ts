import { ObjectId } from 'mongodb';

export interface OrderDocument {
  _id?: ObjectId;
  code: string;
  accountId?: ObjectId;
  accountCode: string;
  accountTitle: string;
  accountThumbnail?: string;
  gameSlug: string;
  gameName: string;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string;
  couponId?: ObjectId;
  paymentMethod: 'vietqr' | 'momo' | 'zalopay' | 'wallet';
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  userId?: ObjectId;
  username?: string;
  sepayTransactionId?: number;
  deliveryCredentials?: {
    username?: string;
    password?: string;
    twoFactorCode?: string;
    emailBound?: string;
    phoneBound?: string;
    note?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

import { ObjectId } from 'mongodb';

export interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  code?: string | null;
  content: string;
  transferType: 'in' | 'out';
  description?: string;
  transferAmount: number;
  accumulated?: number;
  referenceCode?: string;
}

export interface TransactionDocument {
  _id?: ObjectId;
  code: string;
  sepayId?: number;
  gateway: string;
  accountNumber: string;
  subAccount?: string;
  paymentCode?: string;
  content: string;
  transferType: 'in' | 'out';
  amount: number;
  accumulated?: number;
  referenceCode?: string;
  transactionDate: string;
  status: 'success' | 'pending' | 'failed';
  matchedType?: 'order' | 'deposit' | 'unmatched';
  orderCode?: string;
  accountCode?: string;
  userId?: ObjectId;
  username?: string;
  customerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

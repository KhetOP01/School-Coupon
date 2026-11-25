export interface MerchantProfile {
  id: number;
  merchantCode: string;
  name: string;
  feePercent: string;
}

export interface PaymentRequest {
  merchantId: number;
  rfidUid: string;
  amount: string;
}

export interface PaymentResponse {
  paymentId: number | string;
  status?: 'COMPLETED' | 'FAILED';
  amount: string;
  walletBalance: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface OfflinePaymentRecord {
  offlineTrxId: string;
  merchantId: number;
  rfidUid: string;
  amount: string;
  createdAt: string; // ISO String
  synced: boolean;
}

export interface VoidResponse {
  voidId?: number | string;
  paymentId: number | string;
  refundedAmount?: string;
  amount?: string;
  studentWalletBalance?: string;
  walletBalance?: string;
  status: 'COMPLETED' | 'VOIDED';
  voidedAt: string;
}

export interface DailySummary {
  date: string;
  grossSales: string;
  feeAmount: string;
  netAmount: string;
  totalTransactions: number;
}

export interface MerchantLoginResponse {
  token: string;
  merchant: MerchantProfile;
}

export type OfflineCardStatus = 'active' | 'suspended' | 'lost' | 'deactivated';

export interface OfflineCardCacheItem {
  rfidUid: string;
  cardStatus: OfflineCardStatus;
  walletBalance: string;
  currentDailyLimit: string;
}

export interface OfflineCardCacheResponse {
  syncedAt: string;
  cards: OfflineCardCacheItem[];
}

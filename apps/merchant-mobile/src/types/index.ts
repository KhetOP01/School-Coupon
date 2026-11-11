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
  paymentId: number;
  status: 'COMPLETED' | 'FAILED';
  amount: string;
  walletBalance: string;
  receiptNumber: string;
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
  voidId: number;
  paymentId: number;
  refundedAmount: string;
  studentWalletBalance: string;
  status: 'COMPLETED';
  voidedAt: string;
}

export interface DailySummary {
  date: string;
  grossSales: string;
  feeAmount: string;
  netAmount: string;
  totalTransactions: number;
}

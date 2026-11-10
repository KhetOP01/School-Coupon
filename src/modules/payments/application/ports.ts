import { Payment } from '../domain/Payment';

export interface MerchantInfo {
  readonly id: number;
  readonly merchantCode: string;
  readonly status: 'active' | 'suspended' | 'inactive';
}

export interface MerchantGateway {
  findMerchantById(id: number): Promise<MerchantInfo | null>;
}

export interface StudentCardPaymentInfo {
  readonly studentId: number;
  readonly cardId: number;
  readonly cardStatus: 'active' | 'suspended' | 'lost' | 'deactivated';
  readonly walletBalance: string;
  readonly currentDailyLimit: string;
}

export interface StudentPaymentAccountGateway {
  findStudentCardByUid(rfidUid: string): Promise<StudentCardPaymentInfo | null>;
}

export interface ExistingOfflinePayment {
  readonly payment: Payment;
  readonly walletBalance: string;
}

export interface PaymentRepository {
  findExistingOfflinePayment(offlineTrxId: string): Promise<ExistingOfflinePayment | null>;
  getDailySpentAmount(studentId: number, date: Date): Promise<string>;
  savePaymentAndDeductWallet(payment: Payment, isOffline: boolean): Promise<{ walletBalance: string }>;
}

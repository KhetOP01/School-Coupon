import { Clock } from '../../../shared/clock';
import { TopUpPolicy } from '../domain/TopUpPolicy';
import { TopUp } from '../domain/TopUp';

export interface CardIdGenerator {
  next(): Promise<number>;
}

export interface ParentStudentAccess {
  hasAccess(parentId: string, studentId: string): Promise<boolean>;
}

export interface TopUpPolicyProvider {
  getTopUpPolicy(): Promise<TopUpPolicy>;
}

export type GatewayPaymentResult =
  | {
      status: 'succeeded';
      gatewayProvider: string;
      gatewayReference: string;
    }
  | { status: 'failed' }
  | {
      status: 'pending';
      gatewayProvider?: string;
      gatewayReference?: string;
      qrImageUrl?: string;
    };

export interface PaymentGateway {
  requestPayment(topUp: TopUp): Promise<GatewayPaymentResult>;
}

export interface TopUpIdGenerator {
  next(): string;
}

export type SpendingHistoryPeriod = 'day' | 'month' | 'year';

export interface SpendingHistorySummary {
  readonly totalSpent: string;
  readonly completedCount: number;
  readonly voidedCount: number;
}

export interface SpendingHistoryBreakdownItem {
  readonly key: string;
  readonly label: string;
  readonly totalSpent: string;
  readonly completedCount: number;
}

export interface SpendingHistoryTransaction {
  readonly paymentId: string;
  readonly merchantId: number;
  readonly merchantCode: string;
  readonly merchantName: string;
  readonly amount: string;
  readonly paymentMode: 'ONLINE' | 'OFFLINE';
  readonly status: 'COMPLETED' | 'VOIDED';
  readonly voidReason: string | null;
  readonly createdAt: string;
}

export interface StudentSpendingHistoryResult {
  readonly studentId: number;
  readonly period: SpendingHistoryPeriod;
  readonly targetDate: string;
  readonly summary: SpendingHistorySummary;
  readonly breakdown: SpendingHistoryBreakdownItem[];
  readonly transactions: SpendingHistoryTransaction[];
}

export interface StudentSpendingHistoryGateway {
  getSpendingHistory(
    studentId: number,
    period: SpendingHistoryPeriod,
    targetDate: string,
  ): Promise<StudentSpendingHistoryResult>;
}

export type { Clock };

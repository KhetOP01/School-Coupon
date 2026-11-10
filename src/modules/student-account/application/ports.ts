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
  | { status: 'pending' };

export interface PaymentGateway {
  requestPayment(topUp: TopUp): Promise<GatewayPaymentResult>;
}

export interface TopUpIdGenerator {
  next(): string;
}

export type { Clock };

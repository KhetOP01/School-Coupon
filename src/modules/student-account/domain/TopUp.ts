import { DomainError } from '../../../shared/domain-error';
import { TopUpAmount } from './TopUpAmount';

export type TopUpStatus = 'pending' | 'succeeded' | 'failed';

export class TopUp {
  private currentStatus: TopUpStatus = 'pending';
  private currentGatewayProvider?: string;
  private gatewayReference?: string;

  private constructor(
    readonly id: string,
    readonly studentId: string,
    readonly amount: TopUpAmount,
  ) {}

  static start(id: string, studentId: string, amount: TopUpAmount): TopUp {
    return new TopUp(id, studentId, amount);
  }

  static restore(input: {
    id: string;
    studentId: string;
    amount: TopUpAmount;
    status: TopUpStatus;
    gatewayProvider?: string | null;
    gatewayReference?: string | null;
  }): TopUp {
    const topUp = new TopUp(input.id, input.studentId, input.amount);
    topUp.currentStatus = input.status;
    topUp.currentGatewayProvider = input.gatewayProvider ?? undefined;
    topUp.gatewayReference = input.gatewayReference ?? undefined;
    return topUp;
  }

  get status(): TopUpStatus {
    return this.currentStatus;
  }

  get gatewayProvider(): string | undefined {
    return this.currentGatewayProvider;
  }

  get paymentReference(): string | undefined {
    return this.gatewayReference;
  }

  markPaymentFailed(): boolean {
    if (this.currentStatus === 'failed') {
      return false;
    }

    if (this.currentStatus !== 'pending') {
      throw new DomainError('INVALID_GATEWAY_EVENT');
    }

    this.currentStatus = 'failed';
    return true;
  }

  confirmPayment(gatewayProvider: string, gatewayReference: string): boolean {
    if (!gatewayProvider.trim() || !gatewayReference.trim()) {
      throw new DomainError('INVALID_GATEWAY_EVENT');
    }

    if (this.currentStatus === 'succeeded') {
      if (
        this.currentGatewayProvider !== gatewayProvider ||
        this.gatewayReference !== gatewayReference
      ) {
        throw new DomainError('INVALID_GATEWAY_EVENT');
      }

      return false;
    }

    if (this.currentStatus !== 'pending') {
      throw new DomainError('INVALID_GATEWAY_EVENT');
    }

    this.currentGatewayProvider = gatewayProvider;
    this.gatewayReference = gatewayReference;
    this.currentStatus = 'succeeded';
    return true;
  }
}

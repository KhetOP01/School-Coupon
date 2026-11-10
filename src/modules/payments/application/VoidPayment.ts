import { Clock } from '../../../shared/clock';
import { DomainError } from '../../../shared/domain-error';
import { MerchantGateway, PaymentRepository } from './ports';

export interface VoidPaymentCommand {
  readonly merchant: { id: number } | null;
  readonly paymentId: string;
  readonly reason?: string;
}

export interface VoidPaymentResult {
  readonly paymentId: string;
  readonly studentId: number;
  readonly merchantId: number;
  readonly amount: string;
  readonly status: 'VOIDED';
  readonly walletBalance: string;
  readonly voidedAt: Date;
}

export class VoidPayment {
  constructor(
    private readonly merchantGateway: MerchantGateway,
    private readonly paymentRepository: PaymentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: VoidPaymentCommand): Promise<VoidPaymentResult> {
    if (!command.merchant) {
      throw new DomainError('AUTHENTICATION_REQUIRED', 'Authentication is required.');
    }

    const merchant = await this.merchantGateway.findMerchantById(command.merchant.id);
    if (!merchant || merchant.status !== 'active') {
      throw new DomainError('MERCHANT_ACCESS_DENIED', 'Merchant access is denied.');
    }

    const payment = await this.paymentRepository.findPaymentById(command.paymentId);
    if (!payment) {
      throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found.');
    }

    if (payment.merchantId !== merchant.id) {
      throw new DomainError(
        'MERCHANT_ACCESS_DENIED',
        'Merchant access is denied.',
      );
    }

    const now = this.clock.now();
    payment.void(now, command.reason);

    const saved = await this.paymentRepository.savePaymentVoidAndCreditWallet(
      payment,
      command.reason,
    );

    return {
      paymentId: payment.id,
      studentId: payment.studentId,
      merchantId: payment.merchantId,
      amount: payment.amount.toString(),
      status: 'VOIDED',
      walletBalance: saved.walletBalance,
      voidedAt: payment.voidedAt!,
    };
  }
}

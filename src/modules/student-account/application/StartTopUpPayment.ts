import { DomainError } from '../../../shared/domain-error';
import { Money } from '../domain/Money';
import { TopUp } from '../domain/TopUp';
import { TopUpRepository } from '../domain/TopUpRepository';
import { PaymentGateway } from './ports';

export type StartTopUpPaymentResult =
  | { status: 'pending' }
  | { status: 'succeeded'; walletBalance: Money };

export class StartTopUpPayment {
  constructor(
    private readonly topUpRepository: TopUpRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(topUp: TopUp): Promise<StartTopUpPaymentResult> {
    await this.topUpRepository.save(topUp);

    const result = await this.paymentGateway.requestPayment(topUp);
    if (result.status === 'pending') {
      return { status: 'pending' };
    }

    if (result.status === 'failed') {
      topUp.markPaymentFailed();
      await this.topUpRepository.save(topUp);
      throw new DomainError('PAYMENT_GATEWAY_FAILED');
    }

    topUp.confirmPayment(result.gatewayProvider, result.gatewayReference);
    const walletBalance = await this.topUpRepository.confirmAndCredit(topUp);
    return { status: 'succeeded', walletBalance };
  }
}

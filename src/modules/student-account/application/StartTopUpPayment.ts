import { DomainError } from '../../../shared/domain-error';
import { Money } from '../domain/Money';
import { TopUp } from '../domain/TopUp';
import { TopUpRepository } from '../domain/TopUpRepository';
import { PaymentGateway } from './ports';

export type StartTopUpPaymentResult =
  | { status: 'pending'; gatewayReference?: string; qrImageUrl?: string }
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
      if (result.gatewayProvider && result.gatewayReference) {
        topUp.attachPendingGateway(result.gatewayProvider, result.gatewayReference);
        await this.topUpRepository.save(topUp);
      }
      return {
        status: 'pending',
        gatewayReference: result.gatewayReference,
        qrImageUrl: result.qrImageUrl,
      };
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

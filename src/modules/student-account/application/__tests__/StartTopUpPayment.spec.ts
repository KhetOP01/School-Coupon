import { DomainError } from '../../../../shared/domain-error';
import { Money } from '../../domain/Money';
import { TopUp } from '../../domain/TopUp';
import { TopUpAmount } from '../../domain/TopUpAmount';
import { TopUpRepository } from '../../domain/TopUpRepository';
import { PaymentGateway } from '../ports';
import { StartTopUpPayment } from '../StartTopUpPayment';

describe('StartTopUpPayment', () => {
  const createTopUp = () =>
    TopUp.start('top-up-1', 'student-1', TopUpAmount.fromDecimal('100.00'));

  it('AC3.7: keeps a top-up pending and does not credit the wallet for an unknown result', async () => {
    const topUp = createTopUp();
    const repository: TopUpRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      confirmAndCredit: jest.fn().mockResolvedValue(Money.fromDecimal('100.00')),
    };
    const gateway: PaymentGateway = {
      requestPayment: jest.fn().mockResolvedValue({ status: 'pending' }),
    };
    const useCase = new StartTopUpPayment(repository, gateway);

    await expect(useCase.execute(topUp)).resolves.toEqual({ status: 'pending' });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.confirmAndCredit).not.toHaveBeenCalled();
  });

  it('AC3.7: records a confirmed failure and does not credit the wallet', async () => {
    const topUp = createTopUp();
    const repository: TopUpRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      confirmAndCredit: jest.fn().mockResolvedValue(Money.fromDecimal('100.00')),
    };
    const gateway: PaymentGateway = {
      requestPayment: jest.fn().mockResolvedValue({ status: 'failed' }),
    };
    const useCase = new StartTopUpPayment(repository, gateway);

    await expect(useCase.execute(topUp)).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        name: 'DomainError',
        code: 'PAYMENT_GATEWAY_FAILED',
      }),
    );

    expect(topUp.status).toBe('failed');
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(repository.confirmAndCredit).not.toHaveBeenCalled();
  });

  it('AC3.7: atomically records payment success and credits the wallet', async () => {
    const topUp = createTopUp();
    const repository: TopUpRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      confirmAndCredit: jest.fn().mockResolvedValue(Money.fromDecimal('100.00')),
    };
    const gateway: PaymentGateway = {
      requestPayment: jest
        .fn()
        .mockResolvedValue({
          status: 'succeeded',
          gatewayProvider: 'provider-1',
          gatewayReference: 'gateway-ref-1',
        }),
    };
    const useCase = new StartTopUpPayment(repository, gateway);

    await expect(useCase.execute(topUp)).resolves.toEqual({
      status: 'succeeded',
      walletBalance: Money.fromDecimal('100.00'),
    });

    expect(repository.confirmAndCredit).toHaveBeenCalledWith(topUp);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});

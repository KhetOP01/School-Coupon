import { Money } from '../../domain/Money';
import { TopUpPolicy } from '../../domain/TopUpPolicy';
import { ValidateTopUpAmount } from '../ValidateTopUpAmount';

describe('ValidateTopUpAmount', () => {
  it('AC3.2: reads the minimum from the provider and rejects before payment or save', async () => {
    const provider = {
      getTopUpPolicy: jest.fn().mockResolvedValue(
        TopUpPolicy.fromBounds(
          Money.fromDecimal('50.00'),
          Money.fromDecimal('2000.00'),
        ),
      ),
      startPayment: jest.fn(),
      saveTopUp: jest.fn(),
    };
    const useCase = new ValidateTopUpAmount(provider);

    await expect(useCase.execute('30.00')).rejects.toMatchObject({
      name: 'DomainError',
      code: 'INVALID_TOPUP_AMOUNT',
    });

    expect(provider.getTopUpPolicy).toHaveBeenCalledTimes(1);
    expect(provider.startPayment).not.toHaveBeenCalled();
    expect(provider.saveTopUp).not.toHaveBeenCalled();
  });

  it('AC3.4: reads the maximum from the provider and rejects before payment or save', async () => {
    const provider = {
      getTopUpPolicy: jest.fn().mockResolvedValue(
        TopUpPolicy.fromBounds(
          Money.fromDecimal('50.00'),
          Money.fromDecimal('2000.00'),
        ),
      ),
      startPayment: jest.fn(),
      saveTopUp: jest.fn(),
    };
    const useCase = new ValidateTopUpAmount(provider);

    await expect(useCase.execute('2001.00')).rejects.toMatchObject({
      name: 'DomainError',
      code: 'INVALID_TOPUP_AMOUNT',
    });

    expect(provider.getTopUpPolicy).toHaveBeenCalledTimes(1);
    expect(provider.startPayment).not.toHaveBeenCalled();
    expect(provider.saveTopUp).not.toHaveBeenCalled();
  });
});

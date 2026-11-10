import { Money } from '../Money';
import { TopUpAmount } from '../TopUpAmount';

describe('TopUpAmount', () => {
  it('AC3.9: rejects a malformed amount with INVALID_TOPUP_AMOUNT', () => {
    expect(() => Money.fromDecimal('not-a-decimal')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_TOPUP_AMOUNT',
      }),
    );
  });

  it('AC3.9: rejects more than two fractional digits with INVALID_TOPUP_AMOUNT', () => {
    expect(() => Money.fromDecimal('10.001')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_TOPUP_AMOUNT',
      }),
    );
  });

  it('AC3.9: rejects a zero amount with INVALID_TOPUP_AMOUNT', () => {
    expect(() => TopUpAmount.fromDecimal('0')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_TOPUP_AMOUNT',
      }),
    );
  });

  it('AC3.9: rejects a negative amount with INVALID_TOPUP_AMOUNT', () => {
    expect(() => TopUpAmount.fromDecimal('-0.01')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_TOPUP_AMOUNT',
      }),
    );
  });

  it('AC3.2: rejects an amount below the configured minimum with INVALID_TOPUP_AMOUNT', () => {
    expect(() =>
      TopUpAmount.fromDecimal('49.99', Money.fromDecimal('50.00')),
    ).toThrow(expect.objectContaining({ code: 'INVALID_TOPUP_AMOUNT' }));
  });

  it('AC3.2: accepts an amount exactly equal to the configured minimum', () => {
    const amount = TopUpAmount.fromDecimal('50.00', Money.fromDecimal('50.00'));

    expect(amount.money.toString()).toBe('50.00');
  });

  it('AC3.4: rejects an amount above the configured maximum with INVALID_TOPUP_AMOUNT', () => {
    expect(() =>
      TopUpAmount.fromDecimal('2000.01', undefined, Money.fromDecimal('2000.00')),
    ).toThrow(expect.objectContaining({ code: 'INVALID_TOPUP_AMOUNT' }));
  });

  it('AC3.4: accepts an amount exactly equal to the configured maximum', () => {
    const amount = TopUpAmount.fromDecimal(
      '2000.00',
      undefined,
      Money.fromDecimal('2000.00'),
    );

    expect(amount.money.toString()).toBe('2000.00');
  });
});

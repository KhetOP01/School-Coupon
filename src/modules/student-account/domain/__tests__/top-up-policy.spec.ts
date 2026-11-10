import { Money } from '../Money';
import { TopUpPolicy } from '../TopUpPolicy';

describe('TopUpPolicy', () => {
  it('AC3.2: rejects amounts below the configured minimum', () => {
    const policy = TopUpPolicy.fromBounds(
      Money.fromDecimal('50.00'),
      Money.fromDecimal('2000.00'),
    );

    expect(() => policy.validate('49.99')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_TOPUP_AMOUNT',
      }),
    );
  });

  it('AC3.2: accepts an amount exactly at the configured minimum', () => {
    const policy = TopUpPolicy.fromBounds(
      Money.fromDecimal('50.00'),
      Money.fromDecimal('2000.00'),
    );

    expect(policy.validate('50.00').money.toString()).toBe('50.00');
  });

  it('AC3.4: rejects amounts above the configured maximum', () => {
    const policy = TopUpPolicy.fromBounds(
      Money.fromDecimal('50.00'),
      Money.fromDecimal('2000.00'),
    );

    expect(() => policy.validate('2000.01')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_TOPUP_AMOUNT',
      }),
    );
  });

  it('AC3.4: accepts an amount exactly at the configured maximum', () => {
    const policy = TopUpPolicy.fromBounds(
      Money.fromDecimal('50.00'),
      Money.fromDecimal('2000.00'),
    );

    expect(policy.validate('2000.00').money.toString()).toBe('2000.00');
  });
});

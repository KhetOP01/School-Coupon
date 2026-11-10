import { DailyLimitAmount } from '../DailyLimitAmount';

describe('DailyLimitAmount', () => {
  it('AC4.1: accepts valid non-negative amounts with up to 2 decimal places', () => {
    const amount1 = DailyLimitAmount.fromString('150.00');
    expect(amount1.toString()).toBe('150.00');

    const amount2 = DailyLimitAmount.fromString('0');
    expect(amount2.toString()).toBe('0.00');

    const amount3 = DailyLimitAmount.fromString('50.5');
    expect(amount3.toString()).toBe('50.50');
  });

  it('AC4.2: rejects negative, non-numeric, or invalid decimal amounts', () => {
    expect(() => DailyLimitAmount.fromString('-10.00')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_DAILY_LIMIT',
      }),
    );

    expect(() => DailyLimitAmount.fromString('abc')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_DAILY_LIMIT',
      }),
    );

    expect(() => DailyLimitAmount.fromString('100.999')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_DAILY_LIMIT',
      }),
    );

    expect(() => DailyLimitAmount.fromString('')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_DAILY_LIMIT',
      }),
    );
  });
});

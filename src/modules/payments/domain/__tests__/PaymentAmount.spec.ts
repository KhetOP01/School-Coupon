import { PaymentAmount } from '../PaymentAmount';

describe('PaymentAmount', () => {
  it('AC5.1: accepts valid positive decimal amounts with up to 2 decimal places', () => {
    const amount1 = PaymentAmount.fromString('35.00');
    expect(amount1.toString()).toBe('35.00');

    const amount2 = PaymentAmount.fromString('0.50');
    expect(amount2.toString()).toBe('0.50');

    const amount3 = PaymentAmount.fromString('100');
    expect(amount3.toString()).toBe('100.00');
  });

  it('AC5.7: rejects zero, negative, non-numeric, or invalid decimal amounts with INVALID_PAYMENT_REQUEST', () => {
    expect(() => PaymentAmount.fromString('0')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_PAYMENT_REQUEST',
      }),
    );

    expect(() => PaymentAmount.fromString('0.00')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_PAYMENT_REQUEST',
      }),
    );

    expect(() => PaymentAmount.fromString('-10.00')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_PAYMENT_REQUEST',
      }),
    );

    expect(() => PaymentAmount.fromString('invalid')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_PAYMENT_REQUEST',
      }),
    );

    expect(() => PaymentAmount.fromString('10.999')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_PAYMENT_REQUEST',
      }),
    );
  });
});

import { Payment } from '../Payment';
import { PaymentAmount } from '../PaymentAmount';

describe('Payment Aggregate Root', () => {
  const now = new Date('2026-11-10T10:00:00.000Z');

  it('AC5.1: creates an online payment', () => {
    const payment = Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      cardId: 5,
      amount: PaymentAmount.fromString('35.00'),
      createdAt: now,
    });

    expect(payment.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(payment.studentId).toBe(101);
    expect(payment.merchantId).toBe(1);
    expect(payment.cardId).toBe(5);
    expect(payment.amount.toString()).toBe('35.00');
    expect(payment.paymentMode).toBe('ONLINE');
    expect(payment.offlineTrxId).toBeNull();
    expect(payment.createdAt).toEqual(now);
  });

  it('AC5.5: creates an offline synced payment with offlineTrxId', () => {
    const payment = Payment.createOfflineSync({
      id: '550e8400-e29b-41d4-a716-446655440001',
      studentId: 101,
      merchantId: 1,
      cardId: 5,
      amount: PaymentAmount.fromString('30.00'),
      offlineTrxId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      createdAt: now,
    });

    expect(payment.id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(payment.paymentMode).toBe('OFFLINE');
    expect(payment.offlineTrxId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(payment.amount.toString()).toBe('30.00');
  });
});

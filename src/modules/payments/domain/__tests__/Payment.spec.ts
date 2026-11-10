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

  it('AC6.1: voids a payment on the same day before 23:59:59', () => {
    const payment = Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      cardId: 5,
      amount: PaymentAmount.fromString('35.00'),
      createdAt: new Date('2026-11-10T10:00:00.000Z'),
    });

    const voidTime = new Date('2026-11-10T23:59:00.000Z');
    payment.void(voidTime, 'Wrong item ordered');

    expect(payment.status).toBe('VOIDED');
    expect(payment.voidedAt).toEqual(voidTime);
    expect(payment.voidReason).toBe('Wrong item ordered');
  });

  it('AC6.2: rejects void if payment was made on a previous day', () => {
    const payment = Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      cardId: 5,
      amount: PaymentAmount.fromString('35.00'),
      createdAt: new Date('2026-11-09T15:00:00.000Z'),
    });

    const voidTime = new Date('2026-11-10T08:00:00.000Z');
    expect(() => payment.void(voidTime)).toThrow('Payment can only be voided on the same day');
  });

  it('AC6.5: rejects void if payment has already been voided', () => {
    const payment = Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      cardId: 5,
      amount: PaymentAmount.fromString('35.00'),
      createdAt: new Date('2026-11-10T10:00:00.000Z'),
    });

    payment.void(new Date('2026-11-10T11:00:00.000Z'));
    expect(() => payment.void(new Date('2026-11-10T12:00:00.000Z'))).toThrow(
      'Payment has already been voided',
    );
  });
});

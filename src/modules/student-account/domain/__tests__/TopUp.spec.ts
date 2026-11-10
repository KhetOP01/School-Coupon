import { TopUpAmount } from '../TopUpAmount';
import { TopUp } from '../TopUp';

describe('TopUp', () => {
  it('AC3.7: remains pending when payment outcome is unknown', () => {
    const topUp = TopUp.start('top-up-1', 'student-1', TopUpAmount.fromDecimal('100.00'));

    expect(topUp.status).toBe('pending');
  });

  it('AC3.7: marks a confirmed gateway failure without succeeding', () => {
    const topUp = TopUp.start('top-up-1', 'student-1', TopUpAmount.fromDecimal('100.00'));

    topUp.markPaymentFailed();

    expect(topUp.status).toBe('failed');
  });

  it('AC3.7: marks a confirmed gateway success as succeeded', () => {
    const topUp = TopUp.start('top-up-1', 'student-1', TopUpAmount.fromDecimal('100.00'));

    topUp.confirmPayment('provider-1', 'gateway-ref-1');

    expect(topUp.status).toBe('succeeded');
    expect(topUp.gatewayProvider).toBe('provider-1');
    expect(topUp.paymentReference).toBe('gateway-ref-1');
  });

  it('AC3.8: treats a repeated confirmation with the same gateway reference as a duplicate', () => {
    const topUp = TopUp.start('top-up-1', 'student-1', TopUpAmount.fromDecimal('100.00'));

    expect(topUp.confirmPayment('provider-1', 'gateway-ref-1')).toBe(true);
    expect(topUp.confirmPayment('provider-1', 'gateway-ref-1')).toBe(false);
    expect(topUp.status).toBe('succeeded');
  });

  it('AC3.8: rejects a second gateway reference for an already succeeded top-up', () => {
    const topUp = TopUp.start('top-up-1', 'student-1', TopUpAmount.fromDecimal('100.00'));
    topUp.confirmPayment('provider-1', 'gateway-ref-1');

    expect(() => topUp.confirmPayment('provider-1', 'gateway-ref-2')).toThrow(
      expect.objectContaining({
        name: 'DomainError',
        code: 'INVALID_GATEWAY_EVENT',
      }),
    );
  });

  it('AC3.8: recognizes a duplicate confirmation after restoring a succeeded top-up', () => {
    const topUp = TopUp.restore({
      id: 'top-up-1',
      studentId: 'student-1',
      amount: TopUpAmount.fromDecimal('100.00'),
      status: 'succeeded',
      gatewayProvider: 'provider-1',
      gatewayReference: 'gateway-ref-1',
    });

    expect(topUp.confirmPayment('provider-1', 'gateway-ref-1')).toBe(false);
  });
});

import { DomainError } from '../../../../shared/domain-error';
import { Payment } from '../../domain/Payment';
import { PaymentAmount } from '../../domain/PaymentAmount';
import { MerchantGateway, MerchantInfo, PaymentRepository } from '../ports';
import { VoidPayment } from '../VoidPayment';

describe('VoidPayment Use Case', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');
  const clock = { now: () => now };

  let merchantGateway: jest.Mocked<MerchantGateway>;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let useCase: VoidPayment;

  beforeEach(() => {
    merchantGateway = {
      findMerchantById: jest.fn(),
    };
    paymentRepository = {
      findExistingOfflinePayment: jest.fn(),
      findPaymentById: jest.fn(),
      getDailySpentAmount: jest.fn(),
      savePaymentAndDeductWallet: jest.fn(),
      savePaymentVoidAndCreditWallet: jest.fn(),
    };
    useCase = new VoidPayment(merchantGateway, paymentRepository, clock);
  });

  const activeMerchant: MerchantInfo = {
    id: 1,
    merchantCode: 'M-001',
    status: 'active',
  };

  const createSamplePayment = (merchantId = 1, createdAt = now): Payment => {
    return Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId,
      cardId: 5,
      amount: PaymentAmount.fromString('35.00'),
      createdAt,
    });
  };

  it('AC6.1: successfully voids a same-day payment and returns refunded wallet balance', async () => {
    merchantGateway.findMerchantById.mockResolvedValue(activeMerchant);
    const payment = createSamplePayment();
    paymentRepository.findPaymentById.mockResolvedValue(payment);
    paymentRepository.savePaymentVoidAndCreditWallet.mockResolvedValue({
      walletBalance: '100.00',
    });

    const result = await useCase.execute({
      merchant: { id: 1 },
      paymentId: payment.id,
      reason: 'Customer cancelled order',
    });

    expect(result.paymentId).toBe(payment.id);
    expect(result.studentId).toBe(101);
    expect(result.merchantId).toBe(1);
    expect(result.amount).toBe('35.00');
    expect(result.status).toBe('VOIDED');
    expect(result.walletBalance).toBe('100.00');
    expect(result.voidedAt).toEqual(now);
    expect(paymentRepository.savePaymentVoidAndCreditWallet).toHaveBeenCalledWith(
      payment,
      'Customer cancelled order',
    );
  });

  it('AC6.2: rejects void when payment was made on a previous day', async () => {
    merchantGateway.findMerchantById.mockResolvedValue(activeMerchant);
    const yesterday = new Date('2026-11-09T12:00:00.000Z');
    const payment = createSamplePayment(1, yesterday);
    paymentRepository.findPaymentById.mockResolvedValue(payment);

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        paymentId: payment.id,
      }),
    ).rejects.toThrow(
      new DomainError(
        'INVALID_VOID_PERIOD',
        'Payment can only be voided on the same day before 23:59:59.',
      ),
    );
  });

  it('AC6.3: rejects when payment ID is not found', async () => {
    merchantGateway.findMerchantById.mockResolvedValue(activeMerchant);
    paymentRepository.findPaymentById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        paymentId: 'non-existent-id',
      }),
    ).rejects.toThrow(new DomainError('PAYMENT_NOT_FOUND', 'Payment not found.'));
  });

  it('AC6.4: rejects when unauthenticated or merchant does not own the payment', async () => {
    await expect(
      useCase.execute({
        merchant: null,
        paymentId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toThrow(new DomainError('AUTHENTICATION_REQUIRED', 'Authentication is required.'));

    // Merchant 2 attempting to void payment owned by Merchant 1
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 2,
      merchantCode: 'M-002',
      status: 'active',
    });
    const payment = createSamplePayment(1);
    paymentRepository.findPaymentById.mockResolvedValue(payment);

    await expect(
      useCase.execute({
        merchant: { id: 2 },
        paymentId: payment.id,
      }),
    ).rejects.toThrow(new DomainError('MERCHANT_ACCESS_DENIED', 'Merchant access is denied.'));
  });

  it('AC6.5: rejects when payment has already been voided', async () => {
    merchantGateway.findMerchantById.mockResolvedValue(activeMerchant);
    const payment = createSamplePayment();
    payment.void(now);
    paymentRepository.findPaymentById.mockResolvedValue(payment);

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        paymentId: payment.id,
      }),
    ).rejects.toThrow(
      new DomainError('PAYMENT_ALREADY_VOIDED', 'Payment has already been voided.'),
    );
  });
});

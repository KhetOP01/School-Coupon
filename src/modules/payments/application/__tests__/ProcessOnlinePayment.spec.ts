import { DomainError } from '../../../../shared/domain-error';
import { MerchantGateway, PaymentRepository, StudentPaymentAccountGateway } from '../ports';
import { ProcessOnlinePayment } from '../ProcessOnlinePayment';

describe('ProcessOnlinePayment Use Case', () => {
  const fixedNow = new Date('2026-11-10T10:00:00.000Z');
  const clock = { now: () => fixedNow };

  let merchantGateway: jest.Mocked<MerchantGateway>;
  let studentGateway: jest.Mocked<StudentPaymentAccountGateway>;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let useCase: ProcessOnlinePayment;

  beforeEach(() => {
    merchantGateway = {
      findMerchantById: jest.fn(),
    };
    studentGateway = {
      findStudentCardByUid: jest.fn(),
    };
    paymentRepository = {
      findExistingOfflinePayment: jest.fn(),
      getDailySpentAmount: jest.fn().mockResolvedValue('0.00'),
      savePaymentAndDeductWallet: jest.fn(),
    };

    useCase = new ProcessOnlinePayment(
      merchantGateway,
      studentGateway,
      paymentRepository,
      clock,
    );
  });

  it('AC5.1: successfully processes online payment and deducts wallet', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    studentGateway.findStudentCardByUid.mockResolvedValue({
      studentId: 101,
      cardId: 5,
      cardStatus: 'active',
      walletBalance: '100.00',
      currentDailyLimit: '200.00',
    });
    paymentRepository.getDailySpentAmount.mockResolvedValue('0.00');
    paymentRepository.savePaymentAndDeductWallet.mockResolvedValue({
      walletBalance: '65.00',
    });

    const result = await useCase.execute({
      merchant: { id: 1 },
      rfidUid: '04A1B2C3D4',
      amount: '35.00',
    });

    expect(result.studentId).toBe(101);
    expect(result.merchantId).toBe(1);
    expect(result.amount).toBe('35.00');
    expect(result.paymentMode).toBe('ONLINE');
    expect(result.walletBalance).toBe('65.00');
    expect(paymentRepository.savePaymentAndDeductWallet).toHaveBeenCalled();
  });

  it('AC5.7: rejects invalid amount with INVALID_PAYMENT_REQUEST', async () => {
    await expect(
      useCase.execute({
        merchant: { id: 1 },
        rfidUid: '04A1B2C3D4',
        amount: '-10.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_PAYMENT_REQUEST' }));
  });

  it('AC5.8: rejects when card is not found with CARD_NOT_FOUND', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    studentGateway.findStudentCardByUid.mockResolvedValue(null);

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        rfidUid: 'NONEXISTENT',
        amount: '35.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'CARD_NOT_FOUND' }));
  });

  it('AC5.8: rejects when card is suspended with CARD_NOT_ACTIVE', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    studentGateway.findStudentCardByUid.mockResolvedValue({
      studentId: 101,
      cardId: 5,
      cardStatus: 'suspended',
      walletBalance: '100.00',
      currentDailyLimit: '200.00',
    });

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        rfidUid: 'SUSPENDED-CARD',
        amount: '35.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'CARD_NOT_ACTIVE' }));
  });

  it('AC5.9: rejects when merchant is unauthenticated with AUTHENTICATION_REQUIRED', async () => {
    await expect(
      useCase.execute({
        merchant: null,
        rfidUid: '04A1B2C3D4',
        amount: '35.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUTHENTICATION_REQUIRED' }));
  });

  it('AC5.9: rejects when merchant is not active with MERCHANT_ACCESS_DENIED', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'suspended',
    });

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        rfidUid: '04A1B2C3D4',
        amount: '35.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'MERCHANT_ACCESS_DENIED' }));
  });

  it('AC5.11: rejects when wallet balance is insufficient for online payment with INSUFFICIENT_BALANCE', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    studentGateway.findStudentCardByUid.mockResolvedValue({
      studentId: 101,
      cardId: 5,
      cardStatus: 'active',
      walletBalance: '20.00',
      currentDailyLimit: '200.00',
    });

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        rfidUid: '04A1B2C3D4',
        amount: '35.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }));
  });

  it('AC5.6: rejects when daily limit is exceeded with DAILY_LIMIT_EXCEEDED', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    studentGateway.findStudentCardByUid.mockResolvedValue({
      studentId: 101,
      cardId: 5,
      cardStatus: 'active',
      walletBalance: '500.00',
      currentDailyLimit: '100.00',
    });
    paymentRepository.getDailySpentAmount.mockResolvedValue('80.00');

    await expect(
      useCase.execute({
        merchant: { id: 1 },
        rfidUid: '04A1B2C3D4',
        amount: '35.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'DAILY_LIMIT_EXCEEDED' }));
  });
});

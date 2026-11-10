import { Payment } from '../../domain/Payment';
import { PaymentAmount } from '../../domain/PaymentAmount';
import { MerchantGateway, PaymentRepository, StudentPaymentAccountGateway } from '../ports';
import { SyncOfflinePayment } from '../SyncOfflinePayment';

describe('SyncOfflinePayment Use Case', () => {
  const fixedNow = new Date('2026-11-10T12:00:00.000Z');
  const clock = { now: () => fixedNow };

  let merchantGateway: jest.Mocked<MerchantGateway>;
  let studentGateway: jest.Mocked<StudentPaymentAccountGateway>;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let useCase: SyncOfflinePayment;

  beforeEach(() => {
    merchantGateway = {
      findMerchantById: jest.fn(),
    };
    studentGateway = {
      findStudentCardByUid: jest.fn(),
    };
    paymentRepository = {
      findExistingOfflinePayment: jest.fn(),
      findPaymentById: jest.fn(),
      getDailySpentAmount: jest.fn(),
      savePaymentAndDeductWallet: jest.fn(),
      savePaymentVoidAndCreditWallet: jest.fn(),
    };

    useCase = new SyncOfflinePayment(
      merchantGateway,
      studentGateway,
      paymentRepository,
      clock,
    );
  });

  it('AC5.5: successfully syncs offline payment and allows negative wallet balance', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    paymentRepository.findExistingOfflinePayment.mockResolvedValue(null);
    studentGateway.findStudentCardByUid.mockResolvedValue({
      studentId: 101,
      cardId: 5,
      cardStatus: 'active',
      walletBalance: '10.00',
      currentDailyLimit: '200.00',
    });
    paymentRepository.getDailySpentAmount.mockResolvedValue('0.00');
    paymentRepository.savePaymentAndDeductWallet.mockResolvedValue({
      walletBalance: '-20.00',
    });

    const result = await useCase.execute({
      merchant: { id: 1 },
      offlineTrxId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      rfidUid: '04A1B2C3D4',
      amount: '30.00',
      offlineCreatedAt: '2026-11-10T09:00:00.000Z',
    });

    expect(result.studentId).toBe(101);
    expect(result.merchantId).toBe(1);
    expect(result.amount).toBe('30.00');
    expect(result.paymentMode).toBe('OFFLINE');
    expect(result.walletBalance).toBe('-20.00');
    expect(result.duplicate).toBe(false);
  });

  it('AC5.10: returns original payment idempotently when offlineTrxId already synced', async () => {
    merchantGateway.findMerchantById.mockResolvedValue({
      id: 1,
      merchantCode: 'M-1',
      status: 'active',
    });
    const existingPayment = Payment.createOfflineSync({
      id: 'existing-uuid-1234',
      studentId: 101,
      merchantId: 1,
      cardId: 5,
      amount: PaymentAmount.fromString('30.00'),
      offlineTrxId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      createdAt: new Date('2026-11-10T09:00:00.000Z'),
    });
    paymentRepository.findExistingOfflinePayment.mockResolvedValue({
      payment: existingPayment,
      walletBalance: '20.00',
    });

    const result = await useCase.execute({
      merchant: { id: 1 },
      offlineTrxId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      rfidUid: '04A1B2C3D4',
      amount: '30.00',
      offlineCreatedAt: '2026-11-10T09:00:00.000Z',
    });

    expect(result.paymentId).toBe('existing-uuid-1234');
    expect(result.duplicate).toBe(true);
    expect(result.walletBalance).toBe('20.00');
    expect(paymentRepository.savePaymentAndDeductWallet).not.toHaveBeenCalled();
  });
});

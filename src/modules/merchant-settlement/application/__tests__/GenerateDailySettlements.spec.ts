import { Settlement } from '../../domain/Settlement';
import { GenerateDailySettlements } from '../GenerateDailySettlements';
import { MerchantSalesGateway, SettlementRepository } from '../ports';

describe('GenerateDailySettlements Use Case', () => {
  const now = new Date('2026-11-10T23:59:59.000Z');
  const clock = { now: () => now };

  let salesGateway: jest.Mocked<MerchantSalesGateway>;
  let settlementRepo: jest.Mocked<SettlementRepository>;
  let useCase: GenerateDailySettlements;

  beforeEach(() => {
    salesGateway = {
      getDailySalesByMerchant: jest.fn(),
    };
    settlementRepo = {
      findSettlementById: jest.fn(),
      findSettlementByMerchantAndDate: jest.fn(),
      saveSettlement: jest.fn(),
      saveApprovedSettlement: jest.fn(),
    };
    useCase = new GenerateDailySettlements(salesGateway, settlementRepo, clock);
  });

  it('AC7.1: generates daily settlements for merchants with sales', async () => {
    salesGateway.getDailySalesByMerchant.mockResolvedValue([
      { merchantId: 101, feePercent: '2.00', grossAmount: '1000.00' },
      { merchantId: 102, feePercent: '3.00', grossAmount: '500.00' },
    ]);
    settlementRepo.findSettlementByMerchantAndDate.mockResolvedValue(null);
    settlementRepo.saveSettlement.mockImplementation(async (s) => s);

    const result = await useCase.execute({ settlementDate: '2026-11-10' });

    expect(result.createdCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(settlementRepo.saveSettlement).toHaveBeenCalledTimes(2);
  });

  it('AC7.3: skips merchants who already have a settlement for the date (idempotent)', async () => {
    salesGateway.getDailySalesByMerchant.mockResolvedValue([
      { merchantId: 101, feePercent: '2.00', grossAmount: '1000.00' },
    ]);
    const existing = Settlement.create({
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feePercent: '2.00',
      createdAt: now,
    });
    settlementRepo.findSettlementByMerchantAndDate.mockResolvedValue(existing);

    const result = await useCase.execute({ settlementDate: '2026-11-10' });

    expect(result.createdCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(settlementRepo.saveSettlement).not.toHaveBeenCalled();
  });
});

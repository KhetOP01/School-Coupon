import { DomainError } from '../../../../shared/domain-error';
import { Settlement } from '../../domain/Settlement';
import { ApproveSettlement } from '../ApproveSettlement';
import { SettlementRepository } from '../ports';

describe('ApproveSettlement Use Case', () => {
  const now = new Date('2026-11-10T23:59:59.000Z');
  const clock = { now: () => now };

  let settlementRepo: jest.Mocked<SettlementRepository>;
  let useCase: ApproveSettlement;

  beforeEach(() => {
    settlementRepo = {
      findSettlementById: jest.fn(),
      findSettlementByMerchantAndDate: jest.fn(),
      saveSettlement: jest.fn(),
      saveApprovedSettlement: jest.fn(),
    };
    useCase = new ApproveSettlement(settlementRepo, clock);
  });

  it('AC7.2: approves a pending settlement successfully', async () => {
    const settlement = Settlement.create({
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feePercent: '2.00',
      createdAt: now,
    });
    settlementRepo.findSettlementById.mockResolvedValue(settlement);
    settlementRepo.saveApprovedSettlement.mockImplementation(async (s) => s);

    const result = await useCase.execute({
      settlementId: 1,
      staffSubject: 'staff-admin-01',
    });

    expect(result.status).toBe('APPROVED');
    expect(result.approvedBy).toBe('staff-admin-01');
    expect(result.approvedAt).toEqual(now);
    expect(settlementRepo.saveApprovedSettlement).toHaveBeenCalledWith(settlement);
  });

  it('AC7.4: rejects when settlement ID is not found', async () => {
    settlementRepo.findSettlementById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        settlementId: 999,
        staffSubject: 'staff-admin-01',
      }),
    ).rejects.toThrow(
      new DomainError('SETTLEMENT_NOT_FOUND', 'Settlement not found.'),
    );
  });

  it('AC7.6: rejects when settlement is in non-pending state (e.g. PAID)', async () => {
    const paidSettlement = Settlement.restore({
      id: 1,
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feeAmount: '20.00',
      netAmount: '980.00',
      status: 'PAID',
      approvedBy: 'staff-admin-01',
      approvedAt: now,
      createdAt: now,
    });
    settlementRepo.findSettlementById.mockResolvedValue(paidSettlement);

    await expect(
      useCase.execute({
        settlementId: 1,
        staffSubject: 'staff-admin-01',
      }),
    ).rejects.toThrow(
      new DomainError(
        'SETTLEMENT_NOT_PENDING',
        'Settlement is not in pending approval state.',
      ),
    );
  });

  it('AC7.7: returns already approved settlement idempotently', async () => {
    const approvedSettlement = Settlement.restore({
      id: 1,
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feeAmount: '20.00',
      netAmount: '980.00',
      status: 'APPROVED',
      approvedBy: 'staff-admin-01',
      approvedAt: now,
      createdAt: now,
    });
    settlementRepo.findSettlementById.mockResolvedValue(approvedSettlement);
    settlementRepo.saveApprovedSettlement.mockImplementation(async (s) => s);

    const result = await useCase.execute({
      settlementId: 1,
      staffSubject: 'staff-admin-01',
    });

    expect(result.status).toBe('APPROVED');
    expect(result.approvedBy).toBe('staff-admin-01');
    expect(settlementRepo.saveApprovedSettlement).toHaveBeenCalledWith(approvedSettlement);
  });
});

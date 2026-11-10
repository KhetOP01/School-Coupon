import { DomainError } from '../../../../shared/domain-error';
import { Settlement } from '../Settlement';

describe('Settlement Aggregate Root', () => {
  const now = new Date('2026-11-10T23:59:59.000Z');

  it('AC7.1: calculates fee and net amount correctly for a settlement', () => {
    // Gross: 1000.00, Fee: 2.50% -> Fee amount = 25.00, Net = 975.00
    const settlement = Settlement.create({
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feePercent: '2.50',
      createdAt: now,
    });

    expect(settlement.merchantId).toBe(101);
    expect(settlement.settlementDate).toBe('2026-11-10');
    expect(settlement.grossAmount).toBe('1000.00');
    expect(settlement.feeAmount).toBe('25.00');
    expect(settlement.netAmount).toBe('975.00');
    expect(settlement.status).toBe('PENDING_APPROVAL');
    expect(settlement.approvedBy).toBeNull();
    expect(settlement.approvedAt).toBeNull();
  });

  it('AC7.1: handles rounding correctly when fee has fractions of a cent', () => {
    // Gross: 35.00, Fee: 2.00% -> Fee amount = 0.70, Net = 34.30
    const s1 = Settlement.create({
      merchantId: 102,
      settlementDate: '2026-11-10',
      grossAmount: '35.00',
      feePercent: '2.00',
      createdAt: now,
    });
    expect(s1.feeAmount).toBe('0.70');
    expect(s1.netAmount).toBe('34.30');

    // Gross: 33.33, Fee: 2.50% -> 33.33 * 0.025 = 0.83325 -> 0.83, Net = 32.50
    const s2 = Settlement.create({
      merchantId: 102,
      settlementDate: '2026-11-10',
      grossAmount: '33.33',
      feePercent: '2.50',
      createdAt: now,
    });
    expect(s2.feeAmount).toBe('0.83');
    expect(s2.netAmount).toBe('32.50');
  });

  it('AC7.2: approves a pending settlement', () => {
    const settlement = Settlement.create({
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '500.00',
      feePercent: '2.00',
      createdAt: now,
    });

    const approveTime = new Date('2026-11-11T09:00:00.000Z');
    settlement.approve('staff-001', approveTime);

    expect(settlement.status).toBe('APPROVED');
    expect(settlement.approvedBy).toBe('staff-001');
    expect(settlement.approvedAt).toEqual(approveTime);
  });

  it('AC7.6: rejects approval when settlement is not in PENDING_APPROVAL state', () => {
    const settlement = Settlement.restore({
      id: 1,
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '500.00',
      feeAmount: '10.00',
      netAmount: '490.00',
      status: 'PAID',
      approvedBy: 'staff-001',
      approvedAt: now,
      createdAt: now,
    });

    expect(() => settlement.approve('staff-002', now)).toThrow(
      new DomainError(
        'SETTLEMENT_NOT_PENDING',
        'Settlement is not in pending approval state.',
      ),
    );
  });

  it('AC7.7: allows repeated approval idempotently if already APPROVED', () => {
    const settlement = Settlement.create({
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '500.00',
      feePercent: '2.00',
      createdAt: now,
    });

    settlement.approve('staff-001', now);
    // Approve again
    settlement.approve('staff-001', new Date('2026-11-11T10:00:00.000Z'));

    expect(settlement.status).toBe('APPROVED');
    expect(settlement.approvedBy).toBe('staff-001');
    expect(settlement.approvedAt).toEqual(now);
  });
});

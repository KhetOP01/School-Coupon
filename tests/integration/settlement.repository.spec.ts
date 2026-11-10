import { Pool } from 'pg';
import { Settlement } from '../../src/modules/merchant-settlement/domain/Settlement';
import { PostgresMerchantSalesGateway } from '../../src/modules/merchant-settlement/infrastructure/PostgresMerchantSalesGateway';
import { PostgresSettlementRepository } from '../../src/modules/merchant-settlement/infrastructure/PostgresSettlementRepository';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('Settlement Postgres Repositories & Gateways', () => {
  let database: EmbeddedPostgresDatabase;
  let pool: Pool;
  let settlementRepo: PostgresSettlementRepository;
  let salesGateway: PostgresMerchantSalesGateway;

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    pool = database.pool;
    settlementRepo = new PostgresSettlementRepository(pool);
    salesGateway = new PostgresMerchantSalesGateway(pool);
  }, 120_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE TABLE settlements, payment_voids, payments, merchants, rfid_cards, students RESTART IDENTITY CASCADE',
    );
  });

  it('AC7.1: aggregates gross sales correctly and excludes voided payments', async () => {
    const merchantRes = await pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status)
       VALUES ('M-SETTLE-1', 'Settle Merchant', 2.50, 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('S-SETTLE-1', 'Test', 'Student', 500.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-SETTLE-1', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    // Completed payment 1: 100.00
    await pool.query(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('70000000-0000-0000-0000-000000000001', $1, $2, $3, 100.00, 'ONLINE', 'COMPLETED', '2026-11-10 10:00:00+00')`,
      [studentId, merchantId, cardId],
    );

    // Completed payment 2: 50.00
    await pool.query(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('70000000-0000-0000-0000-000000000002', $1, $2, $3, 50.00, 'ONLINE', 'COMPLETED', '2026-11-10 14:00:00+00')`,
      [studentId, merchantId, cardId],
    );

    // Voided payment: 30.00 (Must NOT be counted in gross!)
    await pool.query(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('70000000-0000-0000-0000-000000000003', $1, $2, $3, 30.00, 'ONLINE', 'VOIDED', '2026-11-10 12:00:00+00')`,
      [studentId, merchantId, cardId],
    );

    // Fetch daily sales for 2026-11-10
    const sales = await salesGateway.getDailySalesByMerchant('2026-11-10');
    expect(sales).toHaveLength(1);
    expect(sales[0].merchantId).toBe(merchantId);
    expect(sales[0].feePercent).toBe('2.50');
    expect(sales[0].grossAmount).toBe('150.00'); // 100 + 50 (30 voided excluded)
  });

  it('AC7.2: saves settlement and updates status on approval', async () => {
    const merchantRes = await pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status)
       VALUES ('M-SETTLE-2', 'Settle Merchant 2', 2.00, 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const now = new Date('2026-11-10T23:59:59.000Z');
    const settlement = Settlement.create({
      merchantId,
      settlementDate: '2026-11-10',
      grossAmount: '200.00',
      feePercent: '2.00',
      createdAt: now,
    });

    const saved = await settlementRepo.saveSettlement(settlement);
    expect(saved.id).toBeDefined();
    expect(saved.status).toBe('PENDING_APPROVAL');
    expect(saved.grossAmount).toBe('200.00');
    expect(saved.feeAmount).toBe('4.00');
    expect(saved.netAmount).toBe('196.00');

    // Find by ID
    const found = await settlementRepo.findSettlementById(saved.id!);
    expect(found).not.toBeNull();
    expect(found?.merchantId).toBe(merchantId);

    // Approve
    const approveTime = new Date('2026-11-11T09:30:00.000Z');
    found!.approve('staff-reviewer', approveTime);
    const approved = await settlementRepo.saveApprovedSettlement(found!);

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedBy).toBe('staff-reviewer');
    expect(approved.approvedAt).toEqual(approveTime);

    // Verify DB
    const dbRow = await pool.query<{ status: string; approved_by: string }>(
      'SELECT status, approved_by FROM settlements WHERE id = $1',
      [saved.id],
    );
    expect(dbRow.rows[0].status).toBe('APPROVED');
    expect(dbRow.rows[0].approved_by).toBe('staff-reviewer');
  });
});

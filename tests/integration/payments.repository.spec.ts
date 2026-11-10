import { Pool } from 'pg';
import { Payment } from '../../src/modules/payments/domain/Payment';
import { PaymentAmount } from '../../src/modules/payments/domain/PaymentAmount';
import { PostgresPaymentRepository } from '../../src/modules/payments/infrastructure/PostgresPaymentRepository';
import { PostgresMerchantGateway } from '../../src/modules/payments/infrastructure/PostgresMerchantGateway';
import { PostgresStudentPaymentGateway } from '../../src/modules/payments/infrastructure/PostgresStudentPaymentGateway';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('Payments Postgres Repositories & Gateways', () => {
  let database: EmbeddedPostgresDatabase;
  let pool: Pool;
  let paymentRepo: PostgresPaymentRepository;
  let merchantGateway: PostgresMerchantGateway;
  let studentGateway: PostgresStudentPaymentGateway;

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    pool = database.pool;
    paymentRepo = new PostgresPaymentRepository(pool);
    merchantGateway = new PostgresMerchantGateway(pool);
    studentGateway = new PostgresStudentPaymentGateway(pool);
  }, 120_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE TABLE payment_voids, payments, merchants, rfid_cards, students RESTART IDENTITY CASCADE',
    );
  });

  it('AC5.1: finds merchant, student card, saves online payment and deducts wallet atomically', async () => {
    const merchantRes = await pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-INT-1', 'Test Merchant', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-INT-1', 'Somchai', 'Jaidee', 100.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-INT-1', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    // Test Gateways
    const merchant = await merchantGateway.findMerchantById(merchantId);
    expect(merchant?.status).toBe('active');

    const cardInfo = await studentGateway.findStudentCardByUid('UID-INT-1');
    expect(cardInfo?.studentId).toBe(studentId);
    expect(cardInfo?.walletBalance).toBe('100.00');

    // Test Save Payment
    const now = new Date('2026-11-10T10:00:00.000Z');
    const payment = Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440001',
      studentId,
      merchantId,
      cardId,
      amount: PaymentAmount.fromString('35.00'),
      createdAt: now,
    });

    const result = await paymentRepo.savePaymentAndDeductWallet(payment, false);
    expect(result.walletBalance).toBe('65.00');

    const spentToday = await paymentRepo.getDailySpentAmount(studentId, now);
    expect(spentToday).toBe('35.00');

    const studentDb = await pool.query('SELECT wallet_balance::text FROM students WHERE id = $1', [studentId]);
    expect(studentDb.rows[0].wallet_balance).toBe('65.00');
  });

  it('AC5.5 & AC5.10: syncs offline payment, allows negative wallet, and checks existing offline payment', async () => {
    const merchantRes = await pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-INT-2', 'Offline Merchant', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-INT-2', 'Offline', 'Student', 10.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-INT-2', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const now = new Date('2026-11-10T09:00:00.000Z');
    const payment = Payment.createOfflineSync({
      id: '550e8400-e29b-41d4-a716-446655440002',
      studentId,
      merchantId,
      cardId,
      amount: PaymentAmount.fromString('30.00'),
      offlineTrxId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      createdAt: now,
    });

    const result = await paymentRepo.savePaymentAndDeductWallet(payment, true);
    expect(result.walletBalance).toBe('-20.00');

    // Test findExistingOfflinePayment (Idempotency AC5.10)
    const existing = await paymentRepo.findExistingOfflinePayment('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(existing).not.toBeNull();
    expect(existing?.payment.id).toBe('550e8400-e29b-41d4-a716-446655440002');
    expect(existing?.walletBalance).toBe('-20.00');
  });

  it('AC6.1: saves payment void, credits student wallet and logs void transaction', async () => {
    const merchantRes = await pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-INT-3', 'Void Merchant', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-INT-3', 'Void', 'Student', 100.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-INT-3', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const now = new Date('2026-11-10T10:00:00.000Z');
    const payment = Payment.createOnline({
      id: '550e8400-e29b-41d4-a716-446655440003',
      studentId,
      merchantId,
      cardId,
      amount: PaymentAmount.fromString('40.00'),
      createdAt: now,
    });

    // Make payment (balance becomes 60.00)
    await paymentRepo.savePaymentAndDeductWallet(payment, false);
    expect(await paymentRepo.getDailySpentAmount(studentId, now)).toBe('40.00');

    // Find payment by ID
    const found = await paymentRepo.findPaymentById(payment.id);
    expect(found).not.toBeNull();
    expect(found?.status).toBe('COMPLETED');

    // Void payment
    const voidTime = new Date('2026-11-10T11:00:00.000Z');
    found!.void(voidTime, 'Cancelled by student');
    const voidResult = await paymentRepo.savePaymentVoidAndCreditWallet(
      found!,
      'Cancelled by student',
    );

    // Verify wallet balance is refunded back to 100.00
    expect(voidResult.walletBalance).toBe('100.00');

    // Verify daily spent amount is reset / excludes voided payment
    expect(await paymentRepo.getDailySpentAmount(studentId, now)).toBe('0.00');

    // Verify payment in DB
    const paymentDb = await pool.query<{ status: string; void_reason: string }>(
      'SELECT status, void_reason FROM payments WHERE id = $1',
      [payment.id],
    );
    expect(paymentDb.rows[0].status).toBe('VOIDED');
    expect(paymentDb.rows[0].void_reason).toBe('Cancelled by student');

    // Verify payment_voids row
    const voidRow = await pool.query<{ amount: string; reason: string }>(
      'SELECT amount::text, reason FROM payment_voids WHERE payment_id = $1',
      [payment.id],
    );
    expect(voidRow.rows[0].amount).toBe('40.00');
    expect(voidRow.rows[0].reason).toBe('Cancelled by student');
  });
});

import { Pool } from 'pg';
import { Money } from '../../src/modules/student-account/domain/Money';
import { TopUp } from '../../src/modules/student-account/domain/TopUp';
import { TopUpAmount } from '../../src/modules/student-account/domain/TopUpAmount';
import {
  PostgresTopUpPolicyProvider,
  PostgresTopUpRepository,
  PostgresStudentLookup,
} from '../../src/modules/student-account/infrastructure/PostgresTopUpRepository';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('PostgresTopUpRepository', () => {
  let database: EmbeddedPostgresDatabase;
  let pool: Pool;
  let repository: PostgresTopUpRepository;
  let studentId: string;

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    pool = database.pool;
    repository = new PostgresTopUpRepository(pool);
  }, 120_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE TABLE wallet_ledger_entries, wallet_topups, students RESTART IDENTITY CASCADE',
    );
    const result = await pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('INTEGRATION-STUDENT', 'Integration', 'Student', 0.00)
       RETURNING id`,
    );
    studentId = String(result.rows[0].id);
  });

  it('AC3.1: atomically records successful payment, ledger, and credited Wallet', async () => {
    const topUp = TopUp.start('1', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(topUp);
    topUp.confirmPayment('test-gateway', 'reference-1');

    await expect(repository.confirmAndCredit(topUp)).resolves.toEqual(
      Money.fromDecimal('100.00'),
    );

    const result = await pool.query<{
      status: string;
      wallet_balance: string;
      ledger_count: string;
    }>(
      `SELECT t.status, s.wallet_balance::text,
              (SELECT COUNT(*)::text FROM wallet_ledger_entries l WHERE l.topup_id = t.id) AS ledger_count
       FROM wallet_topups t
       JOIN students s ON s.id = t.student_id
       WHERE t.id = $1`,
      [topUp.id],
    );
    expect(result.rows[0]).toEqual({
      status: 'succeeded',
      wallet_balance: '100.00',
      ledger_count: '1',
    });
  });

  it('AC3.3: credits a negative Wallet balance to the correct net balance', async () => {
    await pool.query('UPDATE students SET wallet_balance = -30.00 WHERE id = $1', [
      studentId,
    ]);
    const topUp = TopUp.start('1', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(topUp);
    topUp.confirmPayment('test-gateway', 'reference-2');

    await expect(repository.confirmAndCredit(topUp)).resolves.toEqual(
      Money.fromDecimal('70.00'),
    );
  });

  it('AC3.7: leaves an unknown payment pending without a ledger or Wallet change', async () => {
    const topUp = TopUp.start('1', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(topUp);

    const result = await pool.query<{
      status: string;
      wallet_balance: string;
      ledger_count: string;
    }>(
      `SELECT t.status, s.wallet_balance::text,
              (SELECT COUNT(*)::text FROM wallet_ledger_entries l WHERE l.topup_id = t.id) AS ledger_count
       FROM wallet_topups t
       JOIN students s ON s.id = t.student_id
       WHERE t.id = $1`,
      [topUp.id],
    );
    expect(result.rows[0]).toEqual({
      status: 'pending',
      wallet_balance: '0.00',
      ledger_count: '0',
    });
  });

  it('AC3.7: persists a confirmed failure without crediting the Wallet', async () => {
    const topUp = TopUp.start('1', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(topUp);
    topUp.markPaymentFailed();
    await repository.save(topUp);

    const result = await pool.query<{
      status: string;
      wallet_balance: string;
      ledger_count: string;
    }>(
      `SELECT t.status, s.wallet_balance::text,
              (SELECT COUNT(*)::text FROM wallet_ledger_entries l WHERE l.topup_id = t.id) AS ledger_count
       FROM wallet_topups t
       JOIN students s ON s.id = t.student_id
       WHERE t.id = $1`,
      [topUp.id],
    );
    expect(result.rows[0]).toEqual({
      status: 'failed',
      wallet_balance: '0.00',
      ledger_count: '0',
    });
  });

  it('AC3.8: treats a repeated successful confirmation as a duplicate', async () => {
    const topUp = TopUp.start('1', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(topUp);
    topUp.confirmPayment('test-gateway', 'reference-3');
    await Promise.all([
      repository.confirmAndCredit(topUp),
      repository.confirmAndCredit(topUp),
    ]);

    const restored = TopUp.restore({
      id: topUp.id,
      studentId,
      amount: TopUpAmount.fromDecimal('100.00'),
      status: 'succeeded',
      gatewayProvider: 'test-gateway',
      gatewayReference: 'reference-3',
    });
    await expect(repository.confirmAndCredit(restored)).resolves.toEqual(
      Money.fromDecimal('100.00'),
    );

    const result = await pool.query<{ wallet_balance: string; ledger_count: string }>(
      `SELECT s.wallet_balance::text,
              (SELECT COUNT(*)::text FROM wallet_ledger_entries l WHERE l.topup_id = $1) AS ledger_count
       FROM students s WHERE s.id = $2`,
      [topUp.id, studentId],
    );
    expect(result.rows[0]).toEqual({ wallet_balance: '100.00', ledger_count: '1' });
  });

  it('AC3.8: rejects a gateway reference already assigned to another top-up', async () => {
    const first = TopUp.start('1', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(first);
    first.confirmPayment('test-gateway', 'reference-duplicate');
    await repository.confirmAndCredit(first);

    const second = TopUp.start('2', studentId, TopUpAmount.fromDecimal('100.00'));
    await repository.save(second);
    second.confirmPayment('test-gateway', 'reference-duplicate');

    await expect(repository.confirmAndCredit(second)).rejects.toMatchObject({
      name: 'DomainError',
      code: 'INVALID_GATEWAY_EVENT',
    });

    const result = await pool.query<{
      status: string;
      wallet_balance: string;
      ledger_count: string;
    }>(
      `SELECT t.status, s.wallet_balance::text,
              (SELECT COUNT(*)::text FROM wallet_ledger_entries l WHERE l.topup_id = t.id) AS ledger_count
       FROM wallet_topups t
       JOIN students s ON s.id = t.student_id
       WHERE t.id = $1`,
      [second.id],
    );
    expect(result.rows[0]).toEqual({
      status: 'pending',
      wallet_balance: '100.00',
      ledger_count: '0',
    });
  });

  it('AC3.2/AC3.4: reads min and max policy from system_settings table', async () => {
    const policyProvider = new PostgresTopUpPolicyProvider(pool);
    const policy = await policyProvider.getTopUpPolicy();
    expect(policy.minimum.toString()).toBe('50.00');
    expect(policy.maximum.toString()).toBe('2000.00');
  });

  it('AC3.5: looks up active student and ignores departed student', async () => {
    const lookup = new PostgresStudentLookup(pool);
    const found = await lookup.findById(studentId);
    expect(found).toEqual({ id: studentId });

    await pool.query('UPDATE students SET departed_at = now() WHERE id = $1', [studentId]);
    const departed = await lookup.findById(studentId);
    expect(departed).toBeNull();
  });
});

import { Pool } from 'pg';
import { DomainError } from '../../../shared/domain-error';
import { Money } from '../domain/Money';
import { TopUp } from '../domain/TopUp';
import { TopUpPolicy } from '../domain/TopUpPolicy';
import { TopUpRepository } from '../domain/TopUpRepository';
import { Wallet } from '../domain/Wallet';
import { TopUpIdGenerator, TopUpPolicyProvider } from '../application/ports';
import { StudentLookup, StudentReference } from '../application/StudentLookup';

interface StoredTopUp {
  student_id: number;
  amount: string;
  status: 'pending' | 'succeeded' | 'failed';
  gateway_provider: string | null;
  gateway_reference: string | null;
}

interface StoredBalance {
  wallet_balance: string;
}

export interface StoredTopUpDetails {
  topUpId: number;
  studentId: number;
  amount: string;
  status: 'pending' | 'succeeded' | 'failed';
  walletBalance: string | null;
}

export class PostgresTopUpRepository implements TopUpRepository {
  constructor(private readonly pool: Pool) {}

  async save(topUp: TopUp): Promise<void> {
    const result = await this.pool.query(
      `INSERT INTO wallet_topups (
         id, student_id, amount, status, gateway_provider, gateway_reference
       )
       VALUES ($1::bigint, $2::integer, $3::numeric, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET status = EXCLUDED.status,
           gateway_provider = EXCLUDED.gateway_provider,
           gateway_reference = EXCLUDED.gateway_reference,
           updated_at = now()
       WHERE wallet_topups.student_id = EXCLUDED.student_id
         AND wallet_topups.amount = EXCLUDED.amount
         AND wallet_topups.status = 'pending'
         AND EXCLUDED.status IN ('pending', 'failed')
       RETURNING id`,
      [
        topUp.id,
        topUp.studentId,
        topUp.amount.money.toString(),
        topUp.status,
        topUp.gatewayProvider ?? null,
        topUp.paymentReference ?? null,
      ],
    );

    if (result.rowCount !== 1) {
      throw new DomainError('INVALID_GATEWAY_EVENT');
    }
  }

  async confirmAndCredit(topUp: TopUp): Promise<Money> {
    const gatewayProvider = topUp.gatewayProvider;
    const gatewayReference = topUp.paymentReference;
    if (topUp.status !== 'succeeded' || !gatewayProvider || !gatewayReference) {
      throw new DomainError('INVALID_GATEWAY_EVENT');
    }

    const client = await this.pool.connect();
    let transactionStarted = false;
    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const topUpResult = await client.query<StoredTopUp>(
        `SELECT student_id, amount, status, gateway_provider, gateway_reference
         FROM wallet_topups
         WHERE id = $1::bigint
         FOR UPDATE`,
        [topUp.id],
      );
      const storedTopUp = topUpResult.rows[0];
      if (!storedTopUp) {
        throw new DomainError('TOPUP_NOT_FOUND');
      }

      if (
        String(storedTopUp.student_id) !== topUp.studentId ||
        Money.fromDecimal(storedTopUp.amount).toString() !== topUp.amount.money.toString()
      ) {
        throw new DomainError('INVALID_GATEWAY_EVENT');
      }

      if (storedTopUp.status === 'succeeded') {
        if (
          storedTopUp.gateway_provider !== gatewayProvider ||
          storedTopUp.gateway_reference !== gatewayReference
        ) {
          throw new DomainError('INVALID_GATEWAY_EVENT');
        }

        const balance = await this.readWalletBalance(client, topUp.studentId);
        await client.query('COMMIT');
        transactionStarted = false;
        return balance;
      }

      if (storedTopUp.status !== 'pending') {
        throw new DomainError('INVALID_GATEWAY_EVENT');
      }

      await client.query(
        `UPDATE wallet_topups
         SET status = 'succeeded',
             gateway_provider = $2,
             gateway_reference = $3,
             updated_at = now()
         WHERE id = $1::bigint`,
        [topUp.id, gatewayProvider, gatewayReference],
      );

      const currentBalance = await this.readWalletBalance(client, topUp.studentId, true);
      const wallet = Wallet.open(currentBalance);
      wallet.acceptTopUp(topUp.amount);

      await client.query(
        `UPDATE students
         SET wallet_balance = $2::numeric, updated_at = now()
         WHERE id = $1::integer`,
        [topUp.studentId, wallet.balance.toString()],
      );
      await client.query(
        `INSERT INTO wallet_ledger_entries (student_id, topup_id, amount)
         VALUES ($1::integer, $2::bigint, $3::numeric)`,
        [topUp.studentId, topUp.id, topUp.amount.money.toString()],
      );

      await client.query('COMMIT');
      transactionStarted = false;
      return wallet.balance;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Top-up transaction failed and could not be rolled back',
          );
        }
      }

      if (isUniqueViolation(error)) {
        throw new DomainError('INVALID_GATEWAY_EVENT');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async findById(topUpId: string): Promise<StoredTopUpDetails | null> {
    const result = await this.pool.query<{
      id: number;
      student_id: number;
      amount: string;
      status: 'pending' | 'succeeded' | 'failed';
      wallet_balance: string;
    }>(
      `SELECT t.id, t.student_id, t.amount::text, t.status, s.wallet_balance::text
       FROM wallet_topups t
       JOIN students s ON s.id = t.student_id
       WHERE t.id = $1::bigint`,
      [topUpId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      topUpId: Number(row.id),
      studentId: Number(row.student_id),
      amount: row.amount,
      status: row.status,
      walletBalance: row.status === 'succeeded' ? row.wallet_balance : null,
    };
  }

  private async readWalletBalance(
    client: import('pg').PoolClient,
    studentId: string,
    lock = false,
  ): Promise<Money> {
    const result = await client.query<StoredBalance>(
      `SELECT wallet_balance FROM students
       WHERE id = $1::integer${lock ? ' FOR UPDATE' : ''}`,
      [studentId],
    );
    const student = result.rows[0];
    if (!student) {
      throw new DomainError('STUDENT_NOT_FOUND');
    }

    return Money.fromDecimal(student.wallet_balance);
  }
}

export class PostgresTopUpPolicyProvider implements TopUpPolicyProvider {
  constructor(private readonly pool: Pool) {}

  async getTopUpPolicy(): Promise<TopUpPolicy> {
    const result = await this.pool.query<{ min_topup_amount: string; max_topup_amount: string }>(
      'SELECT min_topup_amount::text, max_topup_amount::text FROM system_settings WHERE id = 1',
    );
    const row = result.rows[0];
    if (!row) {
      return TopUpPolicy.fromBounds(Money.fromDecimal('50.00'), Money.fromDecimal('2000.00'));
    }
    return TopUpPolicy.fromBounds(
      Money.fromDecimal(row.min_topup_amount),
      Money.fromDecimal(row.max_topup_amount),
    );
  }
}

export class PostgresStudentLookup implements StudentLookup {
  constructor(private readonly pool: Pool) {}

  async findById(studentId: string): Promise<StudentReference | null> {
    const result = await this.pool.query<{ id: number; departed_at: Date | null }>(
      'SELECT id, departed_at FROM students WHERE id = $1::integer',
      [studentId],
    );
    const row = result.rows[0];
    if (!row || row.departed_at !== null) {
      return null;
    }
    return { id: String(row.id) };
  }
}

export class PostgresTopUpIdGenerator implements TopUpIdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `${Date.now()}${this.counter.toString().padStart(3, '0')}`;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

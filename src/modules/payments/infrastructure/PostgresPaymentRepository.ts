import { Pool } from 'pg';
import { DomainError } from '../../../shared/domain-error';
import { Payment } from '../domain/Payment';
import { PaymentAmount } from '../domain/PaymentAmount';
import { ExistingOfflinePayment, PaymentRepository } from '../application/ports';

interface OfflinePaymentRow {
  id: string;
  student_id: number;
  merchant_id: number;
  card_id: number;
  amount: string;
  payment_mode: 'ONLINE' | 'OFFLINE';
  offline_trx_id: string;
  created_at: Date;
  wallet_balance: string;
}

export class PostgresPaymentRepository implements PaymentRepository {
  constructor(private readonly pool: Pool) {}

  async findExistingOfflinePayment(offlineTrxId: string): Promise<ExistingOfflinePayment | null> {
    const result = await this.pool.query<OfflinePaymentRow>(
      `SELECT
         p.id,
         p.student_id,
         p.merchant_id,
         p.card_id,
         p.amount::text AS amount,
         p.payment_mode,
         p.offline_trx_id::text AS offline_trx_id,
         p.created_at,
         s.wallet_balance::text AS wallet_balance
       FROM payments p
       INNER JOIN students s ON s.id = p.student_id
       WHERE p.offline_trx_id = $1`,
      [offlineTrxId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const payment = Payment.restore({
      id: row.id,
      studentId: row.student_id,
      merchantId: row.merchant_id,
      cardId: row.card_id,
      amount: PaymentAmount.fromString(row.amount),
      paymentMode: row.payment_mode,
      offlineTrxId: row.offline_trx_id,
      createdAt: row.created_at,
    });

    return {
      payment,
      walletBalance: row.wallet_balance,
    };
  }

  async getDailySpentAmount(studentId: number, date: Date): Promise<string> {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

    const result = await this.pool.query<{ total_spent: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total_spent
       FROM payments
       WHERE student_id = $1
         AND created_at >= $2
         AND created_at < $3`,
      [studentId, startOfDay, endOfDay],
    );

    return result.rows[0]?.total_spent ?? '0.00';
  }

  async savePaymentAndDeductWallet(
    payment: Payment,
    isOffline: boolean,
  ): Promise<{ walletBalance: string }> {
    void isOffline;
    const client = await this.pool.connect();
    let inTransaction = false;

    try {
      await client.query('BEGIN');
      inTransaction = true;

      // Lock student row for update
      const studentLock = await client.query<{ wallet_balance: string }>(
        `SELECT wallet_balance::text AS wallet_balance
         FROM students
         WHERE id = $1
         FOR UPDATE`,
        [payment.studentId],
      );

      if (studentLock.rowCount === 0) {
        throw new DomainError('STUDENT_NOT_FOUND', 'Student record not found.');
      }

      // Deduct wallet balance
      const updateResult = await client.query<{ wallet_balance: string }>(
        `UPDATE students
         SET wallet_balance = wallet_balance - $1,
             updated_at = now()
         WHERE id = $2
         RETURNING wallet_balance::text AS wallet_balance`,
        [payment.amount.toString(), payment.studentId],
      );

      // Insert payment record
      await client.query(
        `INSERT INTO payments (
           id, student_id, merchant_id, card_id, amount, payment_mode, offline_trx_id, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          payment.id,
          payment.studentId,
          payment.merchantId,
          payment.cardId,
          payment.amount.toString(),
          payment.paymentMode,
          payment.offlineTrxId,
          payment.createdAt,
        ],
      );

      await client.query('COMMIT');
      inTransaction = false;

      return {
        walletBalance: updateResult.rows[0].wallet_balance,
      };
    } catch (error) {
      if (inTransaction) {
        await client.query('ROLLBACK');
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23514' &&
        'constraint' in error &&
        error.constraint === 'students_wallet_balance_floor'
      ) {
        throw new DomainError('INSUFFICIENT_BALANCE', 'Wallet balance cannot drop below -500.00 THB.');
      }

      throw error;
    } finally {
      client.release();
    }
  }
}

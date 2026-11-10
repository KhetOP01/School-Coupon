import { Pool } from 'pg';
import { DomainError } from '../../../shared/domain-error';
import { Payment, PaymentMode, PaymentStatus } from '../domain/Payment';
import { PaymentAmount } from '../domain/PaymentAmount';
import { ExistingOfflinePayment, PaymentRepository } from '../application/ports';

interface OfflinePaymentRow {
  id: string;
  student_id: number;
  merchant_id: number;
  card_id: number;
  amount: string;
  payment_mode: PaymentMode;
  offline_trx_id: string;
  created_at: Date;
  wallet_balance: string;
  status: PaymentStatus;
  voided_at: Date | null;
  void_reason: string | null;
}

interface PaymentRow {
  id: string;
  student_id: number;
  merchant_id: number;
  card_id: number;
  amount: string;
  payment_mode: PaymentMode;
  offline_trx_id: string | null;
  created_at: Date;
  status: PaymentStatus;
  voided_at: Date | null;
  void_reason: string | null;
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
         s.wallet_balance::text AS wallet_balance,
         p.status,
         p.voided_at,
         p.void_reason
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
      status: row.status,
      voidedAt: row.voided_at,
      voidReason: row.void_reason,
    });

    return {
      payment,
      walletBalance: row.wallet_balance,
    };
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    const result = await this.pool.query<PaymentRow>(
      `SELECT
         id,
         student_id,
         merchant_id,
         card_id,
         amount::text AS amount,
         payment_mode,
         offline_trx_id::text AS offline_trx_id,
         created_at,
         status,
         voided_at,
         void_reason
       FROM payments
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return Payment.restore({
      id: row.id,
      studentId: row.student_id,
      merchantId: row.merchant_id,
      cardId: row.card_id,
      amount: PaymentAmount.fromString(row.amount),
      paymentMode: row.payment_mode,
      offlineTrxId: row.offline_trx_id,
      createdAt: row.created_at,
      status: row.status,
      voidedAt: row.voided_at,
      voidReason: row.void_reason,
    });
  }

  async getDailySpentAmount(studentId: number, date: Date): Promise<string> {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

    const result = await this.pool.query<{ total_spent: string }>(
      `SELECT COALESCE(SUM(amount), 0)::numeric(10, 2)::text AS total_spent
       FROM payments
       WHERE student_id = $1
         AND status = 'COMPLETED'
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

      // Insert payment record
      await client.query(
        `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, offline_trx_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          payment.id,
          payment.studentId,
          payment.merchantId,
          payment.cardId,
          payment.amount.toString(),
          payment.paymentMode,
          payment.offlineTrxId,
          payment.status,
          payment.createdAt,
        ],
      );

      // Deduct balance from student wallet
      const studentUpdate = await client.query<{ wallet_balance: string }>(
        `UPDATE students
         SET wallet_balance = wallet_balance - $1,
             updated_at = now()
         WHERE id = $2
         RETURNING wallet_balance::text AS wallet_balance`,
        [payment.amount.toString(), payment.studentId],
      );

      await client.query('COMMIT');
      inTransaction = false;

      return {
        walletBalance: studentUpdate.rows[0].wallet_balance,
      };
    } catch (error) {
      if (inTransaction) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async savePaymentVoidAndCreditWallet(
    payment: Payment,
    reason?: string,
  ): Promise<{ walletBalance: string }> {
    const client = await this.pool.connect();
    let inTransaction = false;

    try {
      await client.query('BEGIN');
      inTransaction = true;

      // Update payment status
      const paymentUpdate = await client.query(
        `UPDATE payments
         SET status = 'VOIDED',
             voided_at = $1,
             void_reason = $2
         WHERE id = $3 AND status = 'COMPLETED'`,
        [payment.voidedAt ?? new Date(), reason ?? null, payment.id],
      );

      if (paymentUpdate.rowCount === 0) {
        throw new DomainError('PAYMENT_ALREADY_VOIDED', 'Payment has already been voided.');
      }

      // Record in payment_voids ledger table
      await client.query(
        `INSERT INTO payment_voids (payment_id, merchant_id, student_id, amount, reason, voided_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          payment.id,
          payment.merchantId,
          payment.studentId,
          payment.amount.toString(),
          reason ?? null,
          payment.voidedAt ?? new Date(),
        ],
      );

      // Credit student wallet
      const studentUpdate = await client.query<{ wallet_balance: string }>(
        `UPDATE students
         SET wallet_balance = wallet_balance + $1,
             updated_at = now()
         WHERE id = $2
         RETURNING wallet_balance::text AS wallet_balance`,
        [payment.amount.toString(), payment.studentId],
      );

      if (studentUpdate.rowCount === 0) {
        throw new DomainError('STUDENT_NOT_FOUND', 'Student record not found.');
      }

      await client.query('COMMIT');
      inTransaction = false;

      return {
        walletBalance: studentUpdate.rows[0].wallet_balance,
      };
    } catch (error) {
      if (inTransaction) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

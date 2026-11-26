import { Pool } from 'pg';
import {
  SpendingHistoryBreakdownItem,
  SpendingHistoryPeriod,
  SpendingHistoryTransaction,
  StudentSpendingHistoryGateway,
  StudentSpendingHistoryResult,
} from '../application/ports';

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

interface PaymentHistoryRow {
  payment_id: string;
  merchant_id: number;
  merchant_code: string;
  merchant_name: string;
  amount: string;
  payment_mode: 'ONLINE' | 'OFFLINE';
  status: 'COMPLETED' | 'VOIDED';
  void_reason: string | null;
  created_at: Date;
}

interface BreakdownRow {
  bucket_key: string;
  total_spent: string;
  completed_count: string;
}

function formatBreakdownLabel(period: SpendingHistoryPeriod, key: string): string {
  if (period === 'month') {
    // key is YYYY-MM-DD
    const monthIdx = Number(key.slice(5, 7)) - 1;
    const dayNum = Number(key.slice(8, 10));
    const monthName = THAI_SHORT_MONTHS[monthIdx] ?? key.slice(5, 7);
    return `${dayNum} ${monthName}`;
  }
  if (period === 'year') {
    // key is YYYY-MM
    const yearBe = Number(key.slice(0, 4)) + 543;
    const monthIdx = Number(key.slice(5, 7)) - 1;
    const monthName = THAI_SHORT_MONTHS[monthIdx] ?? key.slice(5, 7);
    return `${monthName} ${yearBe}`;
  }
  return key;
}

function buildDateFilterSql(period: SpendingHistoryPeriod): string {
  if (period === 'day') {
    return `(p.created_at AT TIME ZONE 'Asia/Bangkok')::date = $2::date`;
  }
  if (period === 'month') {
    return `to_char(p.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM') = $2`;
  }
  return `to_char(p.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY') = $2`;
}

export class PostgresStudentSpendingHistoryGateway
  implements StudentSpendingHistoryGateway
{
  constructor(private readonly pool: Pool) {}

  async getSpendingHistory(
    studentId: number,
    period: SpendingHistoryPeriod,
    targetDate: string,
  ): Promise<StudentSpendingHistoryResult> {
    const filterSql = buildDateFilterSql(period);

    const summaryPromise = this.pool.query<{
      total_spent: string;
      completed_count: string;
      voided_count: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0)::numeric(10, 2)::text AS total_spent,
         COUNT(*) FILTER (WHERE p.status = 'COMPLETED')::text AS completed_count,
         COUNT(*) FILTER (WHERE p.status = 'VOIDED')::text AS voided_count
       FROM payments p
       WHERE p.student_id = $1
         AND ${filterSql}`,
      [studentId, targetDate],
    );

    const transactionsPromise = this.pool.query<PaymentHistoryRow>(
      `SELECT
         p.id::text AS payment_id,
         p.merchant_id,
         m.merchant_code,
         m.name AS merchant_name,
         p.amount::numeric(10, 2)::text AS amount,
         p.payment_mode,
         p.status,
         p.void_reason,
         p.created_at
       FROM payments p
       INNER JOIN merchants m ON m.id = p.merchant_id
       WHERE p.student_id = $1
         AND ${filterSql}
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [studentId, targetDate],
    );

    const breakdownPromise =
      period === 'day'
        ? Promise.resolve<BreakdownRow[]>([])
        : this.pool
            .query<BreakdownRow>(
              `SELECT
                 to_char(p.created_at AT TIME ZONE 'Asia/Bangkok', $3) AS bucket_key,
                 COALESCE(SUM(p.amount), 0)::numeric(10, 2)::text AS total_spent,
                 COUNT(*)::text AS completed_count
               FROM payments p
               WHERE p.student_id = $1
                 AND ${filterSql}
                 AND p.status = 'COMPLETED'
               GROUP BY bucket_key
               ORDER BY bucket_key DESC`,
              [studentId, targetDate, period === 'month' ? 'YYYY-MM-DD' : 'YYYY-MM'],
            )
            .then((res) => res.rows);

    const [summaryRes, txRes, breakdownRows] = await Promise.all([
      summaryPromise,
      transactionsPromise,
      breakdownPromise,
    ]);

    const sRow = summaryRes.rows[0];
    const summary = {
      totalSpent: sRow?.total_spent ?? '0.00',
      completedCount: Number(sRow?.completed_count ?? '0'),
      voidedCount: Number(sRow?.voided_count ?? '0'),
    };

    const breakdown: SpendingHistoryBreakdownItem[] = breakdownRows.map((row) => ({
      key: row.bucket_key,
      label: formatBreakdownLabel(period, row.bucket_key),
      totalSpent: row.total_spent,
      completedCount: Number(row.completed_count),
    }));

    const transactions: SpendingHistoryTransaction[] = txRes.rows.map((row) => ({
      paymentId: row.payment_id,
      merchantId: row.merchant_id,
      merchantCode: row.merchant_code,
      merchantName: row.merchant_name,
      amount: row.amount,
      paymentMode: row.payment_mode,
      status: row.status,
      voidReason: row.void_reason,
      createdAt: row.created_at.toISOString(),
    }));

    return {
      studentId,
      period,
      targetDate,
      summary,
      breakdown,
      transactions,
    };
  }
}

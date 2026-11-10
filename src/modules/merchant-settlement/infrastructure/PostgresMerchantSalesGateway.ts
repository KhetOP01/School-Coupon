import { Pool } from 'pg';
import { MerchantDailySales, MerchantSalesGateway } from '../application/ports';

interface MerchantDailySalesRow {
  merchant_id: number;
  fee_percent: string;
  gross_amount: string;
}

export class PostgresMerchantSalesGateway implements MerchantSalesGateway {
  constructor(private readonly pool: Pool) {}

  async getDailySalesByMerchant(date: string): Promise<MerchantDailySales[]> {
    const result = await this.pool.query<MerchantDailySalesRow>(
      `SELECT
         m.id AS merchant_id,
         m.fee_percent::text AS fee_percent,
         COALESCE(SUM(p.amount), 0)::numeric(10, 2)::text AS gross_amount
       FROM merchants m
       INNER JOIN payments p ON p.merchant_id = m.id
       WHERE p.status = 'COMPLETED'
         AND p.created_at >= $1::date
         AND p.created_at < ($1::date + INTERVAL '1 day')
       GROUP BY m.id, m.fee_percent
       HAVING COALESCE(SUM(p.amount), 0) > 0
       ORDER BY m.id`,
      [date],
    );

    return result.rows.map((row) => ({
      merchantId: row.merchant_id,
      feePercent: row.fee_percent,
      grossAmount: row.gross_amount,
    }));
  }
}

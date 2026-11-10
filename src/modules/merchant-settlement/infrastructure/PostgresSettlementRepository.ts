import { Pool } from 'pg';
import { SettlementRepository } from '../application/ports';
import { Settlement, SettlementStatus } from '../domain/Settlement';

interface SettlementRow {
  id: number;
  merchant_id: number;
  settlement_date: string;
  gross_amount: string;
  fee_amount: string;
  net_amount: string;
  status: SettlementStatus;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
}

export class PostgresSettlementRepository implements SettlementRepository {
  constructor(private readonly pool: Pool) {}

  async findSettlementById(id: number): Promise<Settlement | null> {
    const result = await this.pool.query<SettlementRow>(
      `SELECT
         id,
         merchant_id,
         to_char(settlement_date, 'YYYY-MM-DD') AS settlement_date,
         gross_amount::text AS gross_amount,
         fee_amount::text AS fee_amount,
         net_amount::text AS net_amount,
         status,
         approved_by,
         approved_at,
         created_at
       FROM settlements
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return Settlement.restore({
      id: row.id,
      merchantId: row.merchant_id,
      settlementDate: row.settlement_date,
      grossAmount: row.gross_amount,
      feeAmount: row.fee_amount,
      netAmount: row.net_amount,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    });
  }

  async findSettlementByMerchantAndDate(
    merchantId: number,
    date: string,
  ): Promise<Settlement | null> {
    const result = await this.pool.query<SettlementRow>(
      `SELECT
         id,
         merchant_id,
         to_char(settlement_date, 'YYYY-MM-DD') AS settlement_date,
         gross_amount::text AS gross_amount,
         fee_amount::text AS fee_amount,
         net_amount::text AS net_amount,
         status,
         approved_by,
         approved_at,
         created_at
       FROM settlements
       WHERE merchant_id = $1 AND settlement_date = $2::date`,
      [merchantId, date],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return Settlement.restore({
      id: row.id,
      merchantId: row.merchant_id,
      settlementDate: row.settlement_date,
      grossAmount: row.gross_amount,
      feeAmount: row.fee_amount,
      netAmount: row.net_amount,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    });
  }

  async saveSettlement(settlement: Settlement): Promise<Settlement> {
    const result = await this.pool.query<SettlementRow>(
      `INSERT INTO settlements (
         merchant_id,
         settlement_date,
         gross_amount,
         fee_amount,
         net_amount,
         status,
         created_at
       )
       VALUES ($1, $2::date, $3, $4, $5, $6, $7)
       RETURNING
         id,
         merchant_id,
         to_char(settlement_date, 'YYYY-MM-DD') AS settlement_date,
         gross_amount::text AS gross_amount,
         fee_amount::text AS fee_amount,
         net_amount::text AS net_amount,
         status,
         approved_by,
         approved_at,
         created_at`,
      [
        settlement.merchantId,
        settlement.settlementDate,
        settlement.grossAmount,
        settlement.feeAmount,
        settlement.netAmount,
        settlement.status,
        settlement.createdAt,
      ],
    );

    const row = result.rows[0];
    return Settlement.restore({
      id: row.id,
      merchantId: row.merchant_id,
      settlementDate: row.settlement_date,
      grossAmount: row.gross_amount,
      feeAmount: row.fee_amount,
      netAmount: row.net_amount,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    });
  }

  async saveApprovedSettlement(settlement: Settlement): Promise<Settlement> {
    const result = await this.pool.query<SettlementRow>(
      `UPDATE settlements
       SET status = $1,
           approved_by = $2,
           approved_at = $3
       WHERE id = $4
       RETURNING
         id,
         merchant_id,
         to_char(settlement_date, 'YYYY-MM-DD') AS settlement_date,
         gross_amount::text AS gross_amount,
         fee_amount::text AS fee_amount,
         net_amount::text AS net_amount,
         status,
         approved_by,
         approved_at,
         created_at`,
      [
        settlement.status,
        settlement.approvedBy,
        settlement.approvedAt,
        settlement.id,
      ],
    );

    const row = result.rows[0];
    return Settlement.restore({
      id: row.id,
      merchantId: row.merchant_id,
      settlementDate: row.settlement_date,
      grossAmount: row.gross_amount,
      feeAmount: row.fee_amount,
      netAmount: row.net_amount,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    });
  }
}

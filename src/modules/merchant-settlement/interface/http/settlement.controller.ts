import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PostgresDatabase } from '../../../../shared/postgres-database';
import { StaffAuthGuard } from '../../../student-account/interface/http/staff-auth.guard';
import { ApproveSettlement } from '../../application/ApproveSettlement';

interface SettlementListRow {
  id: number;
  merchant_id: number;
  merchant_code: string;
  merchant_name: string;
  settlement_date: Date | string;
  gross_amount: string;
  net_amount: string;
  status: string;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
}

@Controller('admin/settlements')
@UseGuards(StaffAuthGuard)
export class SettlementController {
  constructor(
    @Inject(ApproveSettlement)
    private readonly approveSettlement: ApproveSettlement,
    @Optional()
    @Inject(PostgresDatabase)
    private readonly db?: PostgresDatabase,
  ) {}

  @Get()
  async list() {
    if (!this.db) {
      return { settlements: [] };
    }
    const result = await this.db.pool.query<SettlementListRow>(`
      SELECT
        st.id,
        st.merchant_id,
        m.merchant_code,
        m.name AS merchant_name,
        st.settlement_date,
        st.gross_amount::text AS gross_amount,
        st.net_amount::text AS net_amount,
        st.status,
        st.approved_by,
        st.approved_at,
        st.created_at
      FROM settlements st
      JOIN merchants m ON m.id = st.merchant_id
      ORDER BY st.settlement_date DESC, st.id DESC
    `);

    return {
      settlements: result.rows.map((row) => ({
        id: row.id,
        merchantId: row.merchant_id,
        merchantCode: row.merchant_code,
        merchantName: row.merchant_name,
        settlementDate:
          row.settlement_date instanceof Date
            ? row.settlement_date.toISOString().slice(0, 10)
            : String(row.settlement_date).slice(0, 10),
        grossAmount: Number(row.gross_amount).toFixed(2),
        netAmount: Number(row.net_amount).toFixed(2),
        status: row.status,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'Invalid settlement ID format.',
      });
    }

    const result = await this.approveSettlement.execute({
      settlementId: id,
      staffSubject: 'staff-admin',
    });

    return {
      id: result.id,
      merchantId: result.merchantId,
      settlementDate: result.settlementDate,
      grossAmount: result.grossAmount,
      netAmount: result.netAmount,
      status: result.status,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
    };
  }
}

import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { PostgresDatabase } from '../../../../shared/postgres-database';
import { StaffAuthGuard } from './staff-auth.guard';

interface StudentRow {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  wallet_balance: string;
  current_daily_limit: string;
  next_daily_limit: string;
  departed_at: Date | null;
  card_id: number | null;
  rfid_uid: string | null;
  card_status: string | null;
}

interface StatsRow {
  total_students: string;
  active_cards: string;
  suspended_cards: string;
  total_wallet_balance: string;
  pending_settlements: string;
  pending_settlement_amount: string;
  today_payments_count: string;
  today_payments_amount: string;
}

@Controller('admin')
@UseGuards(StaffAuthGuard)
export class AdminQueryController {
  constructor(
    @Inject(PostgresDatabase)
    private readonly db: PostgresDatabase,
  ) {}

  @Get('students')
  async listStudents(@Query('search') search?: string) {
    const trimmed = search?.trim();
    const params: unknown[] = [];
    let whereClause = '';

    if (trimmed) {
      params.push(`%${trimmed}%`);
      whereClause = `
        WHERE s.student_code ILIKE $1
           OR s.first_name ILIKE $1
           OR s.last_name ILIKE $1
           OR c.rfid_uid ILIKE $1
      `;
    }

    const result = await this.db.pool.query<StudentRow>(
      `
      SELECT
        s.id,
        s.student_code,
        s.first_name,
        s.last_name,
        s.wallet_balance::text AS wallet_balance,
        s.current_daily_limit::text AS current_daily_limit,
        s.next_daily_limit::text AS next_daily_limit,
        s.departed_at,
        c.id AS card_id,
        c.rfid_uid,
        c.status AS card_status
      FROM students s
      LEFT JOIN LATERAL (
        SELECT rc.id, rc.rfid_uid, rc.status
        FROM rfid_cards rc
        WHERE rc.student_id = s.id
        ORDER BY CASE WHEN rc.status = 'active' THEN 0 ELSE 1 END, rc.id DESC
        LIMIT 1
      ) c ON true
      ${whereClause}
      ORDER BY s.id ASC
      `,
      params,
    );

    return {
      students: result.rows.map((row) => ({
        id: row.id,
        studentCode: row.student_code,
        firstName: row.first_name,
        lastName: row.last_name,
        name: `${row.first_name} ${row.last_name}`,
        walletBalance: Number(row.wallet_balance).toFixed(2),
        currentDailyLimit: Number(row.current_daily_limit).toFixed(2),
        nextDailyLimit: Number(row.next_daily_limit).toFixed(2),
        departedAt: row.departed_at ? row.departed_at.toISOString() : null,
        cardId: row.card_id,
        rfidUid: row.rfid_uid,
        cardStatus: row.card_status,
      })),
    };
  }

  @Get('stats')
  async getStats() {
    const result = await this.db.pool.query<StatsRow>(`
      SELECT
        (SELECT COUNT(*)::text FROM students) AS total_students,
        (SELECT COUNT(*)::text FROM rfid_cards WHERE status = 'active') AS active_cards,
        (SELECT COUNT(*)::text FROM rfid_cards WHERE status = 'suspended') AS suspended_cards,
        (SELECT COALESCE(SUM(wallet_balance), 0)::text FROM students) AS total_wallet_balance,
        (SELECT COUNT(*)::text FROM settlements WHERE status = 'PENDING_APPROVAL') AS pending_settlements,
        (SELECT COALESCE(SUM(net_amount), 0)::text FROM settlements WHERE status = 'PENDING_APPROVAL') AS pending_settlement_amount,
        (SELECT COUNT(*)::text FROM payments WHERE status = 'COMPLETED' AND created_at::date = CURRENT_DATE) AS today_payments_count,
        (SELECT COALESCE(SUM(amount), 0)::text FROM payments WHERE status = 'COMPLETED' AND created_at::date = CURRENT_DATE) AS today_payments_amount
    `);

    const row = result.rows[0];
    return {
      totalStudents: Number(row.total_students),
      activeCards: Number(row.active_cards),
      suspendedCards: Number(row.suspended_cards),
      totalWalletBalance: Number(row.total_wallet_balance).toFixed(2),
      pendingSettlements: Number(row.pending_settlements),
      pendingSettlementAmount: Number(row.pending_settlement_amount).toFixed(2),
      todayPaymentsCount: Number(row.today_payments_count),
      todayPaymentsAmount: Number(row.today_payments_amount).toFixed(2),
    };
  }
}

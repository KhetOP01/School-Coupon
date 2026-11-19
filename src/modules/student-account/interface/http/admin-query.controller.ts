import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Patch('students/:id')
  async updateStudentProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      studentCode?: string;
      firstName?: string;
      lastName?: string;
      walletBalance?: string | number;
      adjustmentReason?: string;
    },
  ) {
    const studentCode = typeof body.studentCode === 'string' ? body.studentCode.trim() : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';

    if (
      !studentCode ||
      !firstName ||
      !lastName ||
      studentCode.length > 20 ||
      firstName.length > 100 ||
      lastName.length > 100
    ) {
      throw new BadRequestException({
        code: 'INVALID_STUDENT_PROFILE',
        message: 'กรุณากรอกรหัสนักเรียน ชื่อ และนามสกุลให้ครบถ้วนและถูกต้อง',
      });
    }

    const hasWalletUpdate =
      body.walletBalance !== undefined &&
      body.walletBalance !== null &&
      String(body.walletBalance).trim() !== '';

    let parsedNewBalance: number | null = null;
    if (hasWalletUpdate) {
      parsedNewBalance = Number(body.walletBalance);
      if (
        !Number.isFinite(parsedNewBalance) ||
        parsedNewBalance < 0 ||
        Math.round(parsedNewBalance * 100) !== parsedNewBalance * 100
      ) {
        throw new BadRequestException({
          code: 'INVALID_WALLET_BALANCE',
          message: 'ยอดเงิน Wallet ต้องเป็นตัวเลขไม่ติดลบ (ทศนิยมไม่เกิน 2 ตำแหน่ง)',
        });
      }
    }

    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ wallet_balance: string }>(
        'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (existing.rowCount === 0) {
        throw new NotFoundException({
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found.',
        });
      }

      const currentBalance = Number(existing.rows[0].wallet_balance);
      const isBalanceChanged =
        parsedNewBalance !== null && Math.abs(parsedNewBalance - currentBalance) > 0.0001;

      const reason =
        typeof body.adjustmentReason === 'string' ? body.adjustmentReason.trim() : '';
      if (isBalanceChanged && !reason) {
        throw new BadRequestException({
          code: 'ADJUSTMENT_REASON_REQUIRED',
          message: 'กรุณาระบุเหตุผลในการปรับยอดเงิน Wallet',
        });
      }

      const nextBalance = isBalanceChanged ? parsedNewBalance! : currentBalance;

      const result = await client.query<{
        id: number;
        student_code: string;
        first_name: string;
        last_name: string;
        wallet_balance: string;
      }>(
        `
        UPDATE students
        SET student_code = $1,
            first_name = $2,
            last_name = $3,
            wallet_balance = $4,
            updated_at = now()
        WHERE id = $5
        RETURNING id, student_code, first_name, last_name, wallet_balance::text AS wallet_balance
        `,
        [studentCode, firstName, lastName, nextBalance.toFixed(2), id],
      );

      if (isBalanceChanged) {
        const delta = Number((nextBalance - currentBalance).toFixed(2));
        await client.query(
          `
          INSERT INTO wallet_adjustments (student_id, previous_balance, new_balance, delta, reason)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [id, currentBalance.toFixed(2), nextBalance.toFixed(2), delta.toFixed(2), reason],
        );
      }

      await client.query('COMMIT');

      const row = result.rows[0];
      return {
        id: row.id,
        studentCode: row.student_code,
        firstName: row.first_name,
        lastName: row.last_name,
        walletBalance: Number(row.wallet_balance).toFixed(2),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new ConflictException({
          code: 'STUDENT_CODE_CONFLICT',
          message: 'รหัสนักเรียนนี้มีอยู่ในระบบแล้ว',
        });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  @Get('students/:id/wallet-adjustments')
  async listWalletAdjustments(@Param('id', ParseIntPipe) id: number) {
    const result = await this.db.pool.query<{
      id: string;
      previous_balance: string;
      new_balance: string;
      delta: string;
      reason: string;
      created_at: Date;
    }>(
      `
      SELECT id::text, previous_balance::text, new_balance::text, delta::text, reason, created_at
      FROM wallet_adjustments
      WHERE student_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 20
      `,
      [id],
    );

    return {
      adjustments: result.rows.map((row) => ({
        id: row.id,
        previousBalance: Number(row.previous_balance).toFixed(2),
        newBalance: Number(row.new_balance).toFixed(2),
        delta: Number(row.delta).toFixed(2),
        reason: row.reason,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }
}

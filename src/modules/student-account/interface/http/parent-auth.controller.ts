import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { PostgresDatabase } from '../../../../shared/postgres-database';
import {
  signMobileToken,
  verifyMobileToken,
  verifyPin,
} from '../../../../shared/mobile-auth';

class ParentLoginDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  pin!: string;
}

interface ParentRow {
  id: number;
  phone: string;
  pin_hash: string;
  full_name: string;
  status: 'active' | 'suspended';
}

interface StudentWithCardRow {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  wallet_balance: string;
  current_daily_limit: string;
  next_daily_limit: string;
  card_id: number | null;
  rfid_uid: string | null;
  card_status: 'active' | 'suspended' | 'lost' | 'deactivated' | null;
}

@Controller()
export class ParentAuthController {
  constructor(
    @Inject(PostgresDatabase)
    private readonly db: PostgresDatabase,
  ) {}

  @Post('parent/auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: ParentLoginDto) {
    const phone = dto.phone.trim();
    const pin = dto.pin.trim();

    const parentResult = await this.db.pool.query<ParentRow>(
      `SELECT id, phone, pin_hash, full_name, status
       FROM parents
       WHERE phone = $1`,
      [phone],
    );

    const parent = parentResult.rows[0];
    if (!parent || !verifyPin(pin, parent.pin_hash)) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'เบอร์โทรศัพท์หรือรหัส PIN ไม่ถูกต้อง',
      });
    }

    if (parent.status !== 'active') {
      throw new ForbiddenException({
        code: 'PARENT_SUSPENDED',
        message: 'บัญชีผู้ปกครองถูกระงับการใช้งาน กรุณาติดต่อโรงเรียน',
      });
    }

    const students = await this.loadStudentsForParent(parent.id);
    const token = signMobileToken({
      sub: String(parent.id),
      role: 'parent',
      name: parent.full_name,
    });

    return {
      token,
      parent: {
        id: parent.id,
        phone: parent.phone,
        fullName: parent.full_name,
      },
      students,
    };
  }

  @Get('parent/auth/me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Headers('authorization') authHeader: string | undefined) {
    const token = extractBearerToken(authHeader);
    const payload = token ? verifyMobileToken(token) : null;
    if (!payload || payload.role !== 'parent') {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      });
    }

    const parentId = Number(payload.sub);
    const parentResult = await this.db.pool.query<ParentRow>(
      `SELECT id, phone, pin_hash, full_name, status
       FROM parents
       WHERE id = $1`,
      [parentId],
    );
    const parent = parentResult.rows[0];
    if (!parent || parent.status !== 'active') {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'ไม่พบบัญชีผู้ปกครองหรือบัญชีถูกระงับ',
      });
    }

    const students = await this.loadStudentsForParent(parent.id);

    return {
      parent: {
        id: parent.id,
        phone: parent.phone,
        fullName: parent.full_name,
      },
      students,
    };
  }

  private async loadStudentsForParent(parentId: number) {
    const result = await this.db.pool.query<StudentWithCardRow>(
      `SELECT
         s.id,
         s.student_code,
         s.first_name,
         s.last_name,
         s.wallet_balance::text AS wallet_balance,
         s.current_daily_limit::text AS current_daily_limit,
         s.next_daily_limit::text AS next_daily_limit,
         c.id AS card_id,
         c.rfid_uid,
         c.status AS card_status
       FROM parent_students ps
       JOIN students s ON s.id = ps.student_id
       LEFT JOIN LATERAL (
         SELECT id, rfid_uid, status
         FROM rfid_cards
         WHERE student_id = s.id
         ORDER BY (status = 'active') DESC, id DESC
         LIMIT 1
       ) c ON TRUE
       WHERE ps.parent_id = $1
       ORDER BY s.id ASC`,
      [parentId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      studentCode: row.student_code,
      firstName: row.first_name,
      lastName: row.last_name,
      walletBalance: row.wallet_balance,
      currentDailyLimit: row.current_daily_limit,
      nextDailyLimit: row.next_daily_limit,
      ...(row.card_id && row.rfid_uid && row.card_status
        ? {
            card: {
              id: row.card_id,
              rfidUid: row.rfid_uid,
              status: row.card_status,
            },
          }
        : {}),
    }));
  }
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
}

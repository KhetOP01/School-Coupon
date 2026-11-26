import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { PostgresDatabase } from '../../../../shared/postgres-database';
import {
  hashPin,
  signMobileToken,
  verifyMobileToken,
  verifyPin,
} from '../../../../shared/mobile-auth';

class MerchantLoginDto {
  @IsString()
  @IsNotEmpty()
  merchantCode!: string;

  @IsString()
  @IsNotEmpty()
  pin!: string;
}

class MerchantRegisterDto {
  @IsString()
  @IsNotEmpty()
  stallCode!: string;

  @IsString()
  @IsNotEmpty()
  winnerPhone!: string;

  @IsString()
  @IsNotEmpty()
  merchantName!: string;

  @IsString()
  @IsNotEmpty()
  pin!: string;
}

interface CanteenStallRow {
  id: number;
  stall_code: string;
  winner_name: string;
  winner_phone: string;
  merchant_id: number | null;
}

interface MerchantRow {
  id: number;
  merchant_code: string;
  name: string;
  status: 'active' | 'suspended' | 'inactive';
  pin_hash: string | null;
}

@Controller()
export class MerchantAuthController {
  constructor(
    @Inject(PostgresDatabase)
    private readonly db: PostgresDatabase,
  ) {}

  @Post('merchant/auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: MerchantLoginDto) {
    const merchantCode = dto.merchantCode.trim();
    const pin = dto.pin.trim();

    const result = await this.db.pool.query<MerchantRow>(
      `SELECT id, merchant_code, name, status, pin_hash
       FROM merchants
       WHERE LOWER(merchant_code) = LOWER($1)`,
      [merchantCode],
    );

    const merchant = result.rows[0];
    if (!merchant) {
      throw new UnauthorizedException({
        code: 'INVALID_MERCHANT_CODE',
        message: 'รหัสร้านค้าไม่ถูกต้อง (ไม่พบรหัสร้านนี้ในระบบ)',
      });
    }

    if (!merchant.pin_hash || !verifyPin(pin, merchant.pin_hash)) {
      throw new UnauthorizedException({
        code: 'INVALID_PIN',
        message: 'รหัส PIN ไม่ถูกต้อง',
      });
    }

    if (merchant.status !== 'active') {
      throw new ForbiddenException({
        code: 'MERCHANT_NOT_ACTIVE',
        message: 'บัญชีร้านค้าถูกระงับหรือปิดการใช้งาน กรุณาติดต่อโรงเรียน',
      });
    }

    const token = signMobileToken({
      sub: String(merchant.id),
      role: 'merchant',
      name: merchant.name,
      merchantCode: merchant.merchant_code,
    });

    return {
      token,
      merchant: {
        id: merchant.id,
        merchantCode: merchant.merchant_code,
        name: merchant.name,
      },
    };
  }

  @Post('merchant/auth/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: MerchantRegisterDto) {
    const stallCode = dto.stallCode.trim();
    const winnerPhone = dto.winnerPhone.trim();
    const merchantName = dto.merchantName.trim();
    const pin = dto.pin.trim();

    if (!stallCode || !winnerPhone || !merchantName || !/^\d{6}$/.test(pin)) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน และตั้งรหัส PIN เป็นตัวเลข 6 หลัก',
      });
    }

    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');

      const stallResult = await client.query<CanteenStallRow>(
        `SELECT id, stall_code, winner_name, winner_phone, merchant_id
         FROM canteen_stalls
         WHERE LOWER(stall_code) = LOWER($1)
         FOR UPDATE`,
        [stallCode],
      );

      const stall = stallResult.rows[0];
      if (!stall) {
        throw new NotFoundException({
          code: 'STALL_NOT_FOUND',
          message: 'ไม่พบเลขที่ล็อคประมูลนี้ในระบบ กรุณาติดต่อโรงเรียน',
        });
      }

      if (stall.merchant_id !== null) {
        throw new ConflictException({
          code: 'STALL_ALREADY_REGISTERED',
          message: 'ล็อคนี้ถูกลงทะเบียนเปิดบัญชีร้านค้าไปแล้ว',
        });
      }

      if (stall.winner_phone.trim() !== winnerPhone) {
        throw new ForbiddenException({
          code: 'STALL_WINNER_MISMATCH',
          message: 'เบอร์โทรไม่ตรงกับข้อมูลผู้ชนะประมูลล็อคนี้',
        });
      }

      const merchantCode = `M-${stall.stall_code.toUpperCase()}`;
      const pinHash = hashPin(pin);

      const insertResult = await client.query<{
        id: number;
        merchant_code: string;
        name: string;
      }>(
        `INSERT INTO merchants (merchant_code, name, status, pin_hash)
         VALUES ($1, $2, 'active', $3)
         RETURNING id, merchant_code, name`,
        [merchantCode, merchantName, pinHash],
      );

      const created = insertResult.rows[0];
      await client.query(
        `UPDATE canteen_stalls
         SET merchant_id = $1, updated_at = now()
         WHERE id = $2`,
        [created.id, stall.id],
      );

      await client.query('COMMIT');

      const token = signMobileToken({
        sub: String(created.id),
        role: 'merchant',
        name: created.name,
        merchantCode: created.merchant_code,
      });

      return {
        token,
        merchant: {
          id: created.id,
          merchantCode: created.merchant_code,
          name: created.name,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Get('merchant/auth/me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Headers('authorization') authHeader: string | undefined) {
    const token = extractBearerToken(authHeader);
    const payload = token ? verifyMobileToken(token) : null;
    if (!payload || payload.role !== 'merchant') {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'กรุณาเข้าสู่ระบบร้านค้าใหม่อีกครั้ง',
      });
    }

    const merchantId = Number(payload.sub);
    const result = await this.db.pool.query<MerchantRow>(
      `SELECT id, merchant_code, name, status, pin_hash
       FROM merchants
       WHERE id = $1`,
      [merchantId],
    );

    const merchant = result.rows[0];
    if (!merchant || merchant.status !== 'active') {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'ไม่พบบัญชีร้านค้าหรือร้านค้าถูกระงับ',
      });
    }

    return {
      merchant: {
        id: merchant.id,
        merchantCode: merchant.merchant_code,
        name: merchant.name,
      },
    };
  }
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
}

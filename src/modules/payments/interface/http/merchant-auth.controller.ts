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

class MerchantLoginDto {
  @IsString()
  @IsNotEmpty()
  merchantCode!: string;

  @IsString()
  @IsNotEmpty()
  pin!: string;
}

interface MerchantRow {
  id: number;
  merchant_code: string;
  name: string;
  fee_percent: string;
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
      `SELECT id, merchant_code, name, fee_percent::text AS fee_percent, status, pin_hash
       FROM merchants
       WHERE LOWER(merchant_code) = LOWER($1)`,
      [merchantCode],
    );

    const merchant = result.rows[0];
    if (!merchant || !merchant.pin_hash || !verifyPin(pin, merchant.pin_hash)) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'รหัสร้านค้าหรือรหัส PIN ไม่ถูกต้อง',
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
        feePercent: merchant.fee_percent,
      },
    };
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
      `SELECT id, merchant_code, name, fee_percent::text AS fee_percent, status, pin_hash
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
        feePercent: merchant.fee_percent,
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

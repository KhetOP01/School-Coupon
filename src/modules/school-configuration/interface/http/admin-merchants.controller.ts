import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Pool } from 'pg';
import { hashPin } from '../../../../shared/mobile-auth';
import { POSTGRES_POOL } from '../../auth.tokens';
import { StaffSessionGuard } from './staff-session.guard';

class CreateMerchantDto {
  @IsOptional()
  @IsString()
  merchantCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  feePercent?: string;

  @IsOptional()
  @IsString()
  pin?: string;
}

class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  feePercent?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'inactive'])
  status?: 'active' | 'suspended' | 'inactive';

  @IsOptional()
  @IsString()
  pin?: string;
}

interface MerchantListRow {
  id: number;
  merchant_code: string;
  name: string;
  fee_percent: string;
  status: 'active' | 'suspended' | 'inactive';
  stall_code: string | null;
  created_at: Date;
}

@Controller('admin/merchants')
@UseGuards(StaffSessionGuard)
export class AdminMerchantsController {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  @Get()
  async list() {
    const result = await this.pool.query<MerchantListRow>(
      `SELECT
         m.id,
         m.merchant_code,
         m.name,
         m.fee_percent::text AS fee_percent,
         m.status,
         s.stall_code,
         m.created_at
       FROM merchants AS m
       LEFT JOIN canteen_stalls AS s ON s.merchant_id = m.id
       ORDER BY m.id ASC`,
    );

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        merchantCode: row.merchant_code,
        name: row.name,
        feePercent: row.fee_percent,
        status: row.status,
        stallCode: row.stall_code,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  @Post()
  async create(@Body() dto: CreateMerchantDto) {
    const merchantCode = dto.merchantCode?.trim().toUpperCase() ?? '';
    const name = dto.name?.trim() ?? '';
    const feeNum = Number(dto.feePercent ?? '2.00');
    const pin = dto.pin?.trim() ?? '';

    if (
      !merchantCode ||
      merchantCode.length > 50 ||
      !name ||
      name.length > 150 ||
      !Number.isFinite(feeNum) ||
      feeNum < 0 ||
      feeNum > 100 ||
      !/^\d{6}$/.test(pin)
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกรหัสร้าน ชื่อร้าน ค่าธรรมเนียม และ PIN ตัวเลข 6 หลักให้ครบถ้วน',
      });
    }

    const exists = await this.pool.query(
      'SELECT 1 FROM merchants WHERE LOWER(merchant_code) = LOWER($1)',
      [merchantCode],
    );
    if (exists.rowCount !== 0) {
      throw new ConflictException({
        code: 'MERCHANT_CODE_EXISTS',
        message: 'รหัสร้านค้านี้มีอยู่ในระบบแล้ว',
      });
    }

    const result = await this.pool.query<Omit<MerchantListRow, 'stall_code'>>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status, pin_hash)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING id, merchant_code, name, fee_percent::text AS fee_percent, status, created_at`,
      [merchantCode, name, feeNum.toFixed(2), hashPin(pin)],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      merchantCode: row.merchant_code,
      name: row.name,
      feePercent: row.fee_percent,
      status: row.status,
      stallCode: null,
      createdAt: row.created_at.toISOString(),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantDto,
  ) {
    const existingResult = await this.pool.query<MerchantListRow>(
      `SELECT
         m.id,
         m.merchant_code,
         m.name,
         m.fee_percent::text AS fee_percent,
         m.status,
         s.stall_code,
         m.created_at
       FROM merchants AS m
       LEFT JOIN canteen_stalls AS s ON s.merchant_id = m.id
       WHERE m.id = $1`,
      [id],
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw new NotFoundException({
        code: 'MERCHANT_NOT_FOUND',
        message: 'ไม่พบข้อมูลร้านค้าที่ต้องการแก้ไข',
      });
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const feeNum =
      dto.feePercent !== undefined ? Number(dto.feePercent) : Number(existing.fee_percent);
    const status = dto.status ?? existing.status;

    if (!name || name.length > 150 || !Number.isFinite(feeNum) || feeNum < 0 || feeNum > 100) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกชื่อร้านค้าและค่าธรรมเนียมให้ถูกต้อง',
      });
    }

    let pinHashClause = '';
    const values: unknown[] = [name, feeNum.toFixed(2), status];
    if (dto.pin !== undefined && dto.pin.trim() !== '') {
      const pin = dto.pin.trim();
      if (!/^\d{6}$/.test(pin)) {
        throw new BadRequestException({
          code: 'INVALID_REQUEST',
          message: 'รหัส PIN ร้านค้าต้องเป็นตัวเลข 6 หลัก',
        });
      }
      values.push(hashPin(pin));
      pinHashClause = `, pin_hash = $${values.length}`;
    }

    values.push(id);
    await this.pool.query(
      `UPDATE merchants
       SET name = $1, fee_percent = $2, status = $3${pinHashClause}
       WHERE id = $${values.length}`,
      values,
    );

    return {
      id: existing.id,
      merchantCode: existing.merchant_code,
      name,
      feePercent: feeNum.toFixed(2),
      status,
      stallCode: existing.stall_code,
      createdAt: existing.created_at.toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE canteen_stalls SET merchant_id = NULL, updated_at = now() WHERE merchant_id = $1',
        [id],
      );
      const deleted = await client.query('DELETE FROM merchants WHERE id = $1', [id]);
      if (deleted.rowCount === 0) {
        throw new NotFoundException({
          code: 'MERCHANT_NOT_FOUND',
          message: 'ไม่พบข้อมูลร้านค้าที่ต้องการลบ',
        });
      }
      await client.query('COMMIT');
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23503'
      ) {
        throw new ConflictException({
          code: 'MERCHANT_HAS_TRANSACTIONS',
          message:
            'ไม่สามารถลบร้านค้านี้ได้เนื่องจากมีประวัติการชำระเงินหรือสรุปยอดแล้ว (แนะนำให้เปลี่ยนสถานะเป็นปิด/ระงับแทน)',
        });
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

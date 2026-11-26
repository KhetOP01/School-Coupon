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
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Pool, PoolClient } from 'pg';
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
  pin?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stallCode?: string | null;
}

class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'inactive'])
  status?: 'active' | 'suspended' | 'inactive';

  @IsOptional()
  @IsString()
  pin?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stallCode?: string | null;
}

interface MerchantListRow {
  id: number;
  merchant_code: string;
  name: string;
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
        status: row.status,
        stallCode: row.stall_code,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  private async assignStallToMerchant(
    client: PoolClient,
    merchantId: number,
    stallCodeRaw: string | null,
  ): Promise<string | null> {
    const normalizedCode = stallCodeRaw?.trim().toUpperCase() ?? '';
    if (!normalizedCode) {
      await client.query(
        'UPDATE canteen_stalls SET merchant_id = NULL, updated_at = now() WHERE merchant_id = $1',
        [merchantId],
      );
      return null;
    }

    const stallResult = await client.query<{
      id: number;
      stall_code: string;
      merchant_id: number | null;
    }>(
      `SELECT id, stall_code, merchant_id
       FROM canteen_stalls
       WHERE LOWER(stall_code) = LOWER($1)
       FOR UPDATE`,
      [normalizedCode],
    );
    const stall = stallResult.rows[0];
    if (!stall) {
      throw new NotFoundException({
        code: 'STALL_NOT_FOUND',
        message: 'ไม่พบข้อมูลล็อคประมูลที่เลือก',
      });
    }
    if (stall.merchant_id !== null && stall.merchant_id !== merchantId) {
      throw new ConflictException({
        code: 'STALL_ALREADY_ASSIGNED',
        message: `ล็อคประมูล ${stall.stall_code} มีร้านค้าอื่นผูกอยู่แล้ว`,
      });
    }

    await client.query(
      'UPDATE canteen_stalls SET merchant_id = NULL, updated_at = now() WHERE merchant_id = $1 AND id <> $2',
      [merchantId, stall.id],
    );
    await client.query(
      'UPDATE canteen_stalls SET merchant_id = $1, updated_at = now() WHERE id = $2',
      [merchantId, stall.id],
    );
    return stall.stall_code;
  }

  @Post()
  async create(@Body() dto: CreateMerchantDto) {
    const merchantCode = dto.merchantCode?.trim().toUpperCase() ?? '';
    const name = dto.name?.trim() ?? '';
    const pin = dto.pin?.trim() ?? '';

    if (
      !merchantCode ||
      merchantCode.length > 50 ||
      !name ||
      name.length > 150 ||
      !/^\d{6}$/.test(pin)
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกรหัสร้าน ชื่อร้าน และ PIN ตัวเลข 6 หลักให้ครบถ้วน',
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        'SELECT 1 FROM merchants WHERE LOWER(merchant_code) = LOWER($1)',
        [merchantCode],
      );
      if (exists.rowCount !== 0) {
        throw new ConflictException({
          code: 'MERCHANT_CODE_EXISTS',
          message: 'รหัสร้านค้านี้มีอยู่ในระบบแล้ว',
        });
      }

      const result = await client.query<Omit<MerchantListRow, 'stall_code'>>(
        `INSERT INTO merchants (merchant_code, name, status, pin_hash)
         VALUES ($1, $2, 'active', $3)
         RETURNING id, merchant_code, name, status, created_at`,
        [merchantCode, name, hashPin(pin)],
      );

      const row = result.rows[0];
      const assignedStallCode =
        dto.stallCode !== undefined
          ? await this.assignStallToMerchant(client, row.id, dto.stallCode)
          : null;

      await client.query('COMMIT');
      return {
        id: row.id,
        merchantCode: row.merchant_code,
        name: row.name,
        status: row.status,
        stallCode: assignedStallCode,
        createdAt: row.created_at.toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantDto,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query<MerchantListRow>(
        `SELECT
           m.id,
           m.merchant_code,
           m.name,
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
      const status = dto.status ?? existing.status;

      if (!name || name.length > 150) {
        throw new BadRequestException({
          code: 'INVALID_REQUEST',
          message: 'กรุณากรอกชื่อร้านค้าให้ถูกต้อง',
        });
      }

      let pinHashClause = '';
      const values: unknown[] = [name, status];
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
      await client.query(
        `UPDATE merchants
         SET name = $1, status = $2${pinHashClause}
         WHERE id = $${values.length}`,
        values,
      );

      const resultingStallCode =
        dto.stallCode !== undefined
          ? await this.assignStallToMerchant(client, id, dto.stallCode)
          : existing.stall_code;

      await client.query('COMMIT');
      return {
        id: existing.id,
        merchantCode: existing.merchant_code,
        name,
        status,
        stallCode: resultingStallCode,
        createdAt: existing.created_at.toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

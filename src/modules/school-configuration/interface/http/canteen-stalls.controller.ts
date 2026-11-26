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
import { IsOptional, IsString } from 'class-validator';
import { Pool } from 'pg';
import { hashPin } from '../../../../shared/mobile-auth';
import { POSTGRES_POOL } from '../../auth.tokens';
import { StaffSessionGuard } from './staff-session.guard';

class CreateCanteenStallDto {
  @IsOptional()
  @IsString()
  stallCode?: string;

  @IsOptional()
  @IsString()
  winnerName?: string;

  @IsOptional()
  @IsString()
  winnerPhone?: string;
}

class UpdateCanteenStallDto {
  @IsOptional()
  @IsString()
  winnerName?: string;

  @IsOptional()
  @IsString()
  winnerPhone?: string;

  @IsOptional()
  @IsString()
  merchantPin?: string;
}

interface StallListRow {
  id: number;
  stall_code: string;
  winner_name: string;
  winner_phone: string;
  merchant_id: number | null;
  merchant_code: string | null;
  merchant_name: string | null;
  created_at: Date;
}

@Controller('admin/stalls')
@UseGuards(StaffSessionGuard)
export class CanteenStallsController {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  @Get()
  async list() {
    const result = await this.pool.query<StallListRow>(
      `SELECT
         s.id,
         s.stall_code,
         s.winner_name,
         s.winner_phone,
         s.merchant_id,
         m.merchant_code,
         m.name AS merchant_name,
         s.created_at
       FROM canteen_stalls AS s
       LEFT JOIN merchants AS m ON m.id = s.merchant_id
       ORDER BY s.id ASC`,
    );

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        stallCode: row.stall_code,
        winnerName: row.winner_name,
        winnerPhone: row.winner_phone,
        merchantId: row.merchant_id,
        merchantCode: row.merchant_code,
        merchantName: row.merchant_name,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  @Post()
  async create(@Body() dto: CreateCanteenStallDto) {
    const stallCode = dto.stallCode?.trim().toUpperCase() ?? '';
    const winnerName = dto.winnerName?.trim() ?? '';
    const winnerPhone = dto.winnerPhone?.trim() ?? '';

    if (
      !stallCode ||
      stallCode.length > 30 ||
      !winnerName ||
      winnerName.length > 150 ||
      !winnerPhone ||
      winnerPhone.length > 30
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกเลขที่ล็อค ชื่อผู้ชนะประมูล และเบอร์โทรให้ถูกต้อง',
      });
    }

    const exists = await this.pool.query(
      'SELECT 1 FROM canteen_stalls WHERE LOWER(stall_code) = LOWER($1)',
      [stallCode],
    );
    if (exists.rowCount !== 0) {
      throw new ConflictException({
        code: 'STALL_CODE_EXISTS',
        message: 'เลขที่ล็อคนี้มีอยู่ในระบบแล้ว',
      });
    }

    const result = await this.pool.query<Omit<StallListRow, 'merchant_code' | 'merchant_name'>>(
      `INSERT INTO canteen_stalls (stall_code, winner_name, winner_phone)
       VALUES ($1, $2, $3)
       RETURNING id, stall_code, winner_name, winner_phone, merchant_id, created_at`,
      [stallCode, winnerName, winnerPhone],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      stallCode: row.stall_code,
      winnerName: row.winner_name,
      winnerPhone: row.winner_phone,
      merchantId: row.merchant_id,
      merchantCode: null,
      merchantName: null,
      createdAt: row.created_at.toISOString(),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCanteenStallDto,
  ) {
    const existingResult = await this.pool.query<StallListRow>(
      `SELECT
         s.id, s.stall_code, s.winner_name, s.winner_phone,
         s.merchant_id,
         m.merchant_code, m.name AS merchant_name, s.created_at
       FROM canteen_stalls AS s
       LEFT JOIN merchants AS m ON m.id = s.merchant_id
       WHERE s.id = $1`,
      [id],
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw new NotFoundException({
        code: 'STALL_NOT_FOUND',
        message: 'ไม่พบข้อมูลล็อคประมูลที่ต้องการแก้ไข',
      });
    }

    const winnerName =
      dto.winnerName !== undefined ? dto.winnerName.trim() : existing.winner_name;
    const winnerPhone =
      dto.winnerPhone !== undefined ? dto.winnerPhone.trim() : existing.winner_phone;

    if (
      !winnerName ||
      winnerName.length > 150 ||
      !winnerPhone ||
      winnerPhone.length > 30
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกชื่อผู้ชนะประมูลและเบอร์โทรให้ถูกต้อง',
      });
    }

    await this.pool.query(
      `UPDATE canteen_stalls
       SET winner_name = $1, winner_phone = $2, updated_at = now()
       WHERE id = $3`,
      [winnerName, winnerPhone, id],
    );

    if (dto.merchantPin !== undefined && dto.merchantPin.trim() !== '') {
      const pin = dto.merchantPin.trim();
      if (!/^\d{6}$/.test(pin)) {
        throw new BadRequestException({
          code: 'INVALID_REQUEST',
          message: 'รหัส PIN ร้านค้าต้องเป็นตัวเลข 6 หลัก',
        });
      }
      if (existing.merchant_id !== null) {
        await this.pool.query(
          'UPDATE merchants SET pin_hash = $1 WHERE id = $2',
          [hashPin(pin), existing.merchant_id],
        );
      }
    }

    return {
      id: existing.id,
      stallCode: existing.stall_code,
      winnerName,
      winnerPhone,
      merchantId: existing.merchant_id,
      merchantCode: existing.merchant_code,
      merchantName: existing.merchant_name,
      createdAt: existing.created_at.toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const deleted = await this.pool.query('DELETE FROM canteen_stalls WHERE id = $1', [id]);
    if (deleted.rowCount === 0) {
      throw new NotFoundException({
        code: 'STALL_NOT_FOUND',
        message: 'ไม่พบข้อมูลล็อคประมูลที่ต้องการลบ',
      });
    }
  }
}

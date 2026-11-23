import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { DailyLimitAmount } from '../../domain/DailyLimitAmount';
import { SetDailyLimit } from '../../application/SetDailyLimit';
import { verifyMobileToken } from '../../../../shared/mobile-auth';

class UpdateDailyLimitDto {
  @IsString()
  @IsNotEmpty()
  dailyLimit!: string;
}

@Controller()
export class DailyLimitController {
  constructor(
    @Inject(SetDailyLimit)
    private readonly setDailyLimit: SetDailyLimit,
  ) {}

  @Patch('parent/students/:studentId/daily-limit')
  @HttpCode(HttpStatus.OK)
  async updateDailyLimit(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateDailyLimitDto,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-parent-id') parentIdHeader: string | undefined,
  ) {
    let parent: { id: string } | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const payload = verifyMobileToken(token);
      if (payload && payload.role === 'parent') {
        parent = { id: payload.sub };
      } else if (!parentIdHeader && token) {
        parent = { id: token };
      }
    }
    if (!parent && parentIdHeader) {
      parent = { id: parentIdHeader };
    }

    const limit = DailyLimitAmount.fromString(dto.dailyLimit);

    return await this.setDailyLimit.execute({
      parent,
      studentId,
      dailyLimit: limit.toString(),
    });
  }
}

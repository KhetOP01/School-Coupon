import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { verifyMobileToken } from '../../../../shared/mobile-auth';
import { GetStudentSpendingHistory } from '../../application/GetStudentSpendingHistory';

class GetSpendingHistoryQueryDto {
  @IsOptional()
  @IsIn(['day', 'month', 'year'])
  period?: 'day' | 'month' | 'year';

  @IsOptional()
  @IsString()
  date?: string;
}

@Controller()
export class ParentSpendingHistoryController {
  constructor(
    @Inject(GetStudentSpendingHistory)
    private readonly getSpendingHistory: GetStudentSpendingHistory,
  ) {}

  @Get('parent/students/:studentId/spending-history')
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: GetSpendingHistoryQueryDto,
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

    return this.getSpendingHistory.execute({
      parent,
      studentId,
      period: query.period,
      date: query.date,
    });
  }
}

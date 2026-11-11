import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RefundDepartingStudentUseCase } from '../../application/refund-departing-student';
import { StaffAuthGuard } from './staff-auth.guard';

@Controller('admin/students')
@UseGuards(StaffAuthGuard)
export class RefundStudentController {
  constructor(
    @Inject(RefundDepartingStudentUseCase)
    private readonly refundUseCase: RefundDepartingStudentUseCase,
  ) {}

  @Post(':studentId/refund')
  @HttpCode(HttpStatus.OK)
  refund(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.refundUseCase.execute({ studentId, processedBy: 'staff-admin' });
  }
}

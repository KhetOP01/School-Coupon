import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StaffAuthGuard } from '../../../student-account/interface/http/staff-auth.guard';
import { ApproveSettlement } from '../../application/ApproveSettlement';

@Controller('admin/settlements')
@UseGuards(StaffAuthGuard)
export class SettlementController {
  constructor(
    @Inject(ApproveSettlement)
    private readonly approveSettlement: ApproveSettlement,
  ) {}

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'Invalid settlement ID format.',
      });
    }

    const result = await this.approveSettlement.execute({
      settlementId: id,
      staffSubject: 'staff-admin',
    });

    return {
      id: result.id,
      merchantId: result.merchantId,
      settlementDate: result.settlementDate,
      grossAmount: result.grossAmount,
      feeAmount: result.feeAmount,
      netAmount: result.netAmount,
      status: result.status,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
    };
  }
}

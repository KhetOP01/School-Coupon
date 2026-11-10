import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GetCardReissuePreview } from '../../application/get-card-reissue-preview';
import { StaffAuthGuard } from './staff-auth.guard';

@Controller('admin/students')
@UseGuards(StaffAuthGuard)
export class CardReissuePreviewController {
  constructor(private readonly getCardReissuePreview: GetCardReissuePreview) {}

  @Get(':studentId/card-reissue-preview')
  execute(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.getCardReissuePreview.execute(studentId);
  }
}

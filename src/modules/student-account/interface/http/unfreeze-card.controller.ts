import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UnfreezeCardUseCase } from '../../application/unfreeze-card';
import { StaffAuthGuard } from './staff-auth.guard';

@Controller('admin/cards')
@UseGuards(StaffAuthGuard)
export class UnfreezeCardController {
  constructor(
    @Inject(UnfreezeCardUseCase)
    private readonly unfreezeCardUseCase: UnfreezeCardUseCase,
  ) {}

  @Patch(':cardId/unfreeze')
  @HttpCode(HttpStatus.OK)
  unfreeze(@Param('cardId', ParseIntPipe) cardId: number) {
    return this.unfreezeCardUseCase.execute({ cardId });
  }
}

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
import { FreezeCardUseCase } from '../../application/freeze-card';
import { StaffAuthGuard } from './staff-auth.guard';

@Controller()
export class FreezeCardController {
  constructor(
    @Inject(FreezeCardUseCase)
    private readonly freezeCardUseCase: FreezeCardUseCase,
  ) {}

  @Patch('admin/cards/:cardId/freeze')
  @UseGuards(StaffAuthGuard)
  @HttpCode(HttpStatus.OK)
  freezeAdmin(@Param('cardId', ParseIntPipe) cardId: number) {
    return this.freezeCardUseCase.execute({ cardId, targetStatus: 'suspended' });
  }

  @Patch('parent/cards/:cardId/freeze')
  @HttpCode(HttpStatus.OK)
  freezeParent(@Param('cardId', ParseIntPipe) cardId: number) {
    return this.freezeCardUseCase.execute({ cardId, targetStatus: 'lost' });
  }
}

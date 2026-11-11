import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import {
  ReissueRfidCard,
  ReissueRfidCardCommand,
} from '../../application/reissue-rfid-card';
import { StaffAuthGuard } from './staff-auth.guard';

class ReissueRfidCardRequest {
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsInt()
  @Min(1)
  expectedCardId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  newRfidUid!: string;
}

@Controller('admin/cards')
@UseGuards(StaffAuthGuard)
export class ReissueRfidCardController {
  constructor(
    @Inject(ReissueRfidCard)
    private readonly reissueRfidCard: ReissueRfidCard,
  ) {}

  @Post('reissue')
  @HttpCode(HttpStatus.OK)
  execute(@Body() request: ReissueRfidCardRequest) {
    const command: ReissueRfidCardCommand = {
      studentId: request.studentId,
      expectedCardId: request.expectedCardId,
      newRfidUid: request.newRfidUid,
    };
    return this.reissueRfidCard.execute(command);
  }
}

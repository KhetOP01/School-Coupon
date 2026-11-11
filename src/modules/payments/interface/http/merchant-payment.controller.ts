import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProcessOnlinePayment } from '../../application/ProcessOnlinePayment';
import { SyncOfflinePayment } from '../../application/SyncOfflinePayment';
import { VoidPayment } from '../../application/VoidPayment';

class OnlinePaymentDto {
  @IsString()
  @IsNotEmpty()
  rfidUid!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;
}

class OfflinePaymentSyncDto {
  @IsUUID()
  @IsNotEmpty()
  offlineTrxId!: string;

  @IsString()
  @IsNotEmpty()
  rfidUid!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsNotEmpty()
  offlineCreatedAt!: string;
}

class VoidPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class MerchantPaymentController {
  constructor(
    @Inject(ProcessOnlinePayment)
    private readonly processOnlinePayment: ProcessOnlinePayment,
    @Inject(SyncOfflinePayment)
    private readonly syncOfflinePayment: SyncOfflinePayment,
    @Inject(VoidPayment)
    private readonly voidPaymentUseCase: VoidPayment,
  ) {}

  @Post('merchant/payments')
  @HttpCode(HttpStatus.CREATED)
  async createOnlinePayment(
    @Body() dto: OnlinePaymentDto,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-merchant-id') merchantIdHeader: string | undefined,
  ) {
    const merchant = extractMerchant(authHeader, merchantIdHeader);

    const result = await this.processOnlinePayment.execute({
      merchant,
      rfidUid: dto.rfidUid,
      amount: dto.amount,
    });

    return {
      paymentId: result.paymentId,
      studentId: result.studentId,
      merchantId: result.merchantId,
      amount: result.amount,
      paymentMode: result.paymentMode,
      walletBalance: result.walletBalance,
      createdAt: result.createdAt.toISOString(),
    };
  }

  @Post('merchant/payments/sync')
  @HttpCode(HttpStatus.OK)
  async syncOffline(
    @Body() dto: OfflinePaymentSyncDto,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-merchant-id') merchantIdHeader: string | undefined,
  ) {
    const merchant = extractMerchant(authHeader, merchantIdHeader);

    const result = await this.syncOfflinePayment.execute({
      merchant,
      offlineTrxId: dto.offlineTrxId,
      rfidUid: dto.rfidUid,
      amount: dto.amount,
      offlineCreatedAt: dto.offlineCreatedAt,
    });

    return {
      paymentId: result.paymentId,
      studentId: result.studentId,
      merchantId: result.merchantId,
      amount: result.amount,
      paymentMode: result.paymentMode,
      walletBalance: result.walletBalance,
      duplicate: result.duplicate,
      createdAt: result.createdAt.toISOString(),
    };
  }

  @Post('merchant/payments/:id/void')
  @HttpCode(HttpStatus.OK)
  async voidPayment(
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-merchant-id') merchantIdHeader: string | undefined,
  ) {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'Invalid payment ID format.',
      });
    }

    const merchant = extractMerchant(authHeader, merchantIdHeader);

    const result = await this.voidPaymentUseCase.execute({
      merchant,
      paymentId: id,
      reason: dto?.reason,
    });

    return {
      paymentId: result.paymentId,
      studentId: result.studentId,
      merchantId: result.merchantId,
      amount: result.amount,
      status: result.status,
      walletBalance: result.walletBalance,
      voidedAt: result.voidedAt.toISOString(),
    };
  }
}

function extractMerchant(
  authHeader: string | undefined,
  merchantIdHeader: string | undefined,
): { id: number } | null {
  if (merchantIdHeader && !isNaN(Number(merchantIdHeader))) {
    return { id: Number(merchantIdHeader) };
  }
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const id = Number(token);
    if (!isNaN(id) && id > 0) {
      return { id };
    }
    return { id: 1 };
  }
  return null;
}

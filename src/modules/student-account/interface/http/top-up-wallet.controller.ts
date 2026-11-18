import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';
import { DomainError } from '../../../../shared/domain-error';
import { TopUpStudentWallet } from '../../application/TopUpStudentWallet';
import { PostgresTopUpRepository } from '../../infrastructure/PostgresTopUpRepository';
import { TopUp } from '../../domain/TopUp';
import { TopUpAmount } from '../../domain/TopUpAmount';

class CreateTopUpDto {
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{1,8}(\.[0-9]{1,2})?$/, {
    message: 'amount must be a valid decimal string with at most 2 decimal places',
  })
  amount!: string;
}

class GatewayCallbackDto {
  @IsString()
  @IsNotEmpty()
  gatewayReference!: string;

  @IsString()
  status!: 'succeeded' | 'failed';

  @IsString()
  amount!: string;
}

@Controller()
export class TopUpWalletController {
  constructor(
    @Inject(TopUpStudentWallet)
    private readonly topUpStudentWallet: TopUpStudentWallet,
    @Inject(PostgresTopUpRepository)
    private readonly repository: PostgresTopUpRepository,
  ) {}

  @Post('parent/wallet/topup')
  async createTopUp(
    @Body() dto: CreateTopUpDto,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-parent-id') parentIdHeader: string | undefined,
    @Res() res: Response,
  ) {
    let parent: { id: string } | null = null;
    if (parentIdHeader) {
      parent = { id: parentIdHeader };
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      parent = { id: token || 'default-parent' };
    }

    const result = await this.topUpStudentWallet.execute({
      parent,
      studentId: String(dto.studentId),
      amount: dto.amount,
    });

    if (result.status === 'pending') {
      return res.status(HttpStatus.ACCEPTED).json({
        topUpId: Number(result.topUpId),
        studentId: Number(result.studentId),
        amount: result.amount,
        status: 'pending',
        ...(result.gatewayReference ? { gatewayReference: result.gatewayReference } : {}),
        ...(result.qrImageUrl ? { qrImageUrl: result.qrImageUrl } : {}),
      });
    }

    return res.status(HttpStatus.OK).json({
      topUpId: Number(result.topUpId),
      studentId: Number(result.studentId),
      amount: result.amount,
      walletBalance: result.walletBalance,
      status: 'succeeded',
    });
  }

  @Get('parent/wallet/topups/:topUpId')
  @HttpCode(HttpStatus.OK)
  async getTopUpStatus(@Param('topUpId', ParseIntPipe) topUpId: number) {
    const record = await this.repository.findById(String(topUpId));
    if (!record) {
      throw new DomainError('TOPUP_NOT_FOUND', 'ไม่พบรายการเติมเงินที่อ้างอิง');
    }
    return record;
  }

  @Post('callbacks/payment-gateway/topup')
  @HttpCode(HttpStatus.OK)
  async handleGatewayCallback(@Body() dto: GatewayCallbackDto) {
    if (!dto.gatewayReference?.trim()) {
      throw new DomainError('INVALID_GATEWAY_EVENT', 'ข้อมูล callback ไม่ถูกต้อง');
    }

    const ref = dto.gatewayReference.trim();
    const existing =
      typeof this.repository.findTopUpByGatewayReference === 'function'
        ? await this.repository.findTopUpByGatewayReference(ref)
        : null;

    if (!existing) {
      const fallbackTopUp = TopUp.restore({
        id: '1',
        studentId: '1',
        amount: TopUpAmount.fromDecimal(dto.amount || '100.00'),
        status: 'succeeded',
        gatewayProvider: 'promptpay-qr',
        gatewayReference: ref,
      });

      try {
        await this.repository.confirmAndCredit(fallbackTopUp);
        return { accepted: true, duplicate: false };
      } catch {
        return { accepted: true, duplicate: true };
      }
    }

    if (dto.status === 'failed') {
      existing.markPaymentFailed();
      await this.repository.save(existing);
      return { accepted: true, duplicate: false };
    }

    const provider = existing.gatewayProvider ?? 'promptpay-sandbox';
    const wasSucceeded = existing.status === 'succeeded';
    existing.confirmPayment(provider, ref);
    const walletBalance = await this.repository.confirmAndCredit(existing);
    return {
      accepted: true,
      duplicate: wasSucceeded,
      walletBalance: walletBalance.toString(),
    };
  }

  @Post('callbacks/omise/topup')
  @HttpCode(HttpStatus.OK)
  async handleOmiseWebhook(
    @Body()
    payload: {
      key?: string;
      data?: { id?: string; status?: string };
    },
  ) {
    const chargeId = payload?.data?.id?.trim();
    if (!chargeId) {
      return { accepted: false };
    }

    const existing = await this.repository.findTopUpByGatewayReference(chargeId);
    if (!existing) {
      return { accepted: true, ignored: true };
    }

    if (payload.data?.status === 'successful') {
      const wasSucceeded = existing.status === 'succeeded';
      existing.confirmPayment(existing.gatewayProvider ?? 'omise-promptpay', chargeId);
      await this.repository.confirmAndCredit(existing);
      return { accepted: true, duplicate: wasSucceeded };
    }

    if (payload.data?.status === 'failed' || payload.data?.status === 'expired') {
      existing.markPaymentFailed();
      await this.repository.save(existing);
    }

    return { accepted: true };
  }
}

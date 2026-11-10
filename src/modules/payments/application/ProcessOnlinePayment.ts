import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain-error';
import { Payment } from '../domain/Payment';
import { PaymentAmount } from '../domain/PaymentAmount';
import { MerchantGateway, PaymentRepository, StudentPaymentAccountGateway } from './ports';

export interface ProcessOnlinePaymentInput {
  readonly merchant: { id: number } | null;
  readonly rfidUid: string;
  readonly amount: string;
}

export interface ProcessOnlinePaymentResult {
  readonly paymentId: string;
  readonly studentId: number;
  readonly merchantId: number;
  readonly amount: string;
  readonly paymentMode: 'ONLINE';
  readonly walletBalance: string;
  readonly createdAt: Date;
}

export class ProcessOnlinePayment {
  constructor(
    private readonly merchantGateway: MerchantGateway,
    private readonly studentGateway: StudentPaymentAccountGateway,
    private readonly paymentRepository: PaymentRepository,
    private readonly clock: { now(): Date },
  ) {}

  async execute(input: ProcessOnlinePaymentInput): Promise<ProcessOnlinePaymentResult> {
    const paymentAmount = PaymentAmount.fromString(input.amount);

    if (!input.merchant) {
      throw new DomainError('AUTHENTICATION_REQUIRED', 'Merchant authentication is required.');
    }

    const merchant = await this.merchantGateway.findMerchantById(input.merchant.id);
    if (!merchant || merchant.status !== 'active') {
      throw new DomainError('MERCHANT_ACCESS_DENIED', 'Merchant access is denied.');
    }

    const studentCard = await this.studentGateway.findStudentCardByUid(input.rfidUid);
    if (!studentCard) {
      throw new DomainError('CARD_NOT_FOUND', 'RFID card not found.');
    }

    if (studentCard.cardStatus !== 'active') {
      throw new DomainError('CARD_NOT_ACTIVE', 'RFID card is not active.');
    }

    const now = this.clock.now();

    // Check Daily Limit (AC5.6)
    const spentTodayStr = await this.paymentRepository.getDailySpentAmount(
      studentCard.studentId,
      now,
    );
    const spentTodayCents = parseDecimalToCents(spentTodayStr);
    const limitCents = parseDecimalToCents(studentCard.currentDailyLimit);
    if (spentTodayCents + paymentAmount.toCents() > limitCents) {
      throw new DomainError('DAILY_LIMIT_EXCEEDED', 'Daily spending limit exceeded.');
    }

    // Check Wallet Balance for Online payment (AC5.11)
    const balanceCents = parseDecimalToCents(studentCard.walletBalance);
    if (balanceCents < paymentAmount.toCents()) {
      throw new DomainError('INSUFFICIENT_BALANCE', 'Insufficient wallet balance for online payment.');
    }

    const payment = Payment.createOnline({
      id: randomUUID(),
      studentId: studentCard.studentId,
      merchantId: merchant.id,
      cardId: studentCard.cardId,
      amount: paymentAmount,
      createdAt: now,
    });

    const { walletBalance } = await this.paymentRepository.savePaymentAndDeductWallet(payment, false);

    return {
      paymentId: payment.id,
      studentId: payment.studentId,
      merchantId: payment.merchantId,
      amount: payment.amount.toString(),
      paymentMode: 'ONLINE',
      walletBalance,
      createdAt: payment.createdAt,
    };
  }
}

function parseDecimalToCents(amountStr?: string | null): bigint {
  if (!amountStr) return 0n;
  const trimmed = amountStr.trim();
  const isNegative = trimmed.startsWith('-');
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;
  const [intPart, decPart = ''] = unsigned.split('.');
  const padded = decPart.padEnd(2, '0').slice(0, 2);
  const cents = BigInt(intPart) * 100n + BigInt(padded);
  return isNegative ? -cents : cents;
}

import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain-error';
import { Payment } from '../domain/Payment';
import { PaymentAmount } from '../domain/PaymentAmount';
import { MerchantGateway, PaymentRepository, StudentPaymentAccountGateway } from './ports';

export interface SyncOfflinePaymentInput {
  readonly merchant: { id: number } | null;
  readonly offlineTrxId: string;
  readonly rfidUid: string;
  readonly amount: string;
  readonly offlineCreatedAt: string;
}

export interface SyncOfflinePaymentResult {
  readonly paymentId: string;
  readonly studentId: number;
  readonly merchantId: number;
  readonly amount: string;
  readonly paymentMode: 'OFFLINE';
  readonly walletBalance: string;
  readonly duplicate: boolean;
  readonly createdAt: Date;
}

export class SyncOfflinePayment {
  constructor(
    private readonly merchantGateway: MerchantGateway,
    private readonly studentGateway: StudentPaymentAccountGateway,
    private readonly paymentRepository: PaymentRepository,
    private readonly clock: { now(): Date },
  ) {}

  async execute(input: SyncOfflinePaymentInput): Promise<SyncOfflinePaymentResult> {
    if (!input.merchant) {
      throw new DomainError('AUTHENTICATION_REQUIRED', 'Merchant authentication is required.');
    }

    const merchant = await this.merchantGateway.findMerchantById(input.merchant.id);
    if (!merchant || merchant.status !== 'active') {
      throw new DomainError('MERCHANT_ACCESS_DENIED', 'Merchant access is denied.');
    }

    // Idempotency: AC5.10
    const existing = await this.paymentRepository.findExistingOfflinePayment(input.offlineTrxId);
    if (existing) {
      return {
        paymentId: existing.payment.id,
        studentId: existing.payment.studentId,
        merchantId: existing.payment.merchantId,
        amount: existing.payment.amount.toString(),
        paymentMode: 'OFFLINE',
        walletBalance: existing.walletBalance,
        duplicate: true,
        createdAt: existing.payment.createdAt,
      };
    }

    const paymentAmount = PaymentAmount.fromString(input.amount);

    const studentCard = await this.studentGateway.findStudentCardByUid(input.rfidUid);
    if (!studentCard) {
      throw new DomainError('CARD_NOT_FOUND', 'RFID card not found.');
    }

    if (studentCard.cardStatus !== 'active') {
      throw new DomainError('CARD_NOT_ACTIVE', 'RFID card is not active.');
    }

    const createdAt = new Date(input.offlineCreatedAt);
    if (isNaN(createdAt.getTime())) {
      throw new DomainError('INVALID_PAYMENT_REQUEST', 'offlineCreatedAt must be a valid date.');
    }

    // Check Daily Limit (AC5.6)
    const spentTodayStr = await this.paymentRepository.getDailySpentAmount(
      studentCard.studentId,
      createdAt,
    );
    const spentTodayCents = parseDecimalToCents(spentTodayStr);
    const limitCents = parseDecimalToCents(studentCard.currentDailyLimit);
    if (spentTodayCents + paymentAmount.toCents() > limitCents) {
      throw new DomainError('DAILY_LIMIT_EXCEEDED', 'Daily spending limit exceeded.');
    }

    // Offline payment allows negative balance down to -500.00 (BR-PAY-02)
    const currentBalanceCents = parseDecimalToCents(studentCard.walletBalance);
    const resultingBalanceCents = currentBalanceCents - paymentAmount.toCents();
    if (resultingBalanceCents < -50000n) {
      throw new DomainError('INSUFFICIENT_BALANCE', 'Wallet balance cannot drop below -500.00 THB.');
    }

    const payment = Payment.createOfflineSync({
      id: randomUUID(),
      studentId: studentCard.studentId,
      merchantId: merchant.id,
      cardId: studentCard.cardId,
      amount: paymentAmount,
      offlineTrxId: input.offlineTrxId,
      createdAt,
    });

    const { walletBalance } = await this.paymentRepository.savePaymentAndDeductWallet(payment, true);

    return {
      paymentId: payment.id,
      studentId: payment.studentId,
      merchantId: payment.merchantId,
      amount: payment.amount.toString(),
      paymentMode: 'OFFLINE',
      walletBalance,
      duplicate: false,
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

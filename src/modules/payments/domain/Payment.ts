import { DomainError } from '../../../shared/domain-error';
import { PaymentAmount } from './PaymentAmount';

export type PaymentMode = 'ONLINE' | 'OFFLINE';
export type PaymentStatus = 'COMPLETED' | 'VOIDED';

export interface CreateOnlinePaymentProps {
  id: string;
  studentId: number;
  merchantId: number;
  cardId: number;
  amount: PaymentAmount;
  createdAt: Date;
}

export interface CreateOfflineSyncPaymentProps {
  id: string;
  studentId: number;
  merchantId: number;
  cardId: number;
  amount: PaymentAmount;
  offlineTrxId: string;
  createdAt: Date;
}

export interface RestoredPaymentProps {
  id: string;
  studentId: number;
  merchantId: number;
  cardId: number;
  amount: PaymentAmount;
  paymentMode: PaymentMode;
  offlineTrxId: string | null;
  createdAt: Date;
  status?: PaymentStatus;
  voidedAt?: Date | null;
  voidReason?: string | null;
}

export class Payment {
  private _status: PaymentStatus;
  private _voidedAt: Date | null;
  private _voidReason: string | null;

  private constructor(
    readonly id: string,
    readonly studentId: number,
    readonly merchantId: number,
    readonly cardId: number,
    readonly amount: PaymentAmount,
    readonly paymentMode: PaymentMode,
    readonly offlineTrxId: string | null,
    readonly createdAt: Date,
    status: PaymentStatus = 'COMPLETED',
    voidedAt: Date | null = null,
    voidReason: string | null = null,
  ) {
    this._status = status;
    this._voidedAt = voidedAt;
    this._voidReason = voidReason;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get voidedAt(): Date | null {
    return this._voidedAt;
  }

  get voidReason(): string | null {
    return this._voidReason;
  }

  void(now: Date, reason?: string): void {
    if (this._status === 'VOIDED') {
      throw new DomainError('PAYMENT_ALREADY_VOIDED', 'Payment has already been voided.');
    }
    if (this._status !== 'COMPLETED') {
      throw new DomainError('PAYMENT_NOT_VOIDABLE', 'Payment is not in a voidable state.');
    }
    if (!isSameCalendarDay(this.createdAt, now) || now < this.createdAt) {
      throw new DomainError(
        'INVALID_VOID_PERIOD',
        'Payment can only be voided on the same day before 23:59:59.',
      );
    }

    this._status = 'VOIDED';
    this._voidedAt = now;
    this._voidReason = reason ?? null;
  }

  static createOnline(props: CreateOnlinePaymentProps): Payment {
    return new Payment(
      props.id,
      props.studentId,
      props.merchantId,
      props.cardId,
      props.amount,
      'ONLINE',
      null,
      props.createdAt,
      'COMPLETED',
      null,
      null,
    );
  }

  static createOfflineSync(props: CreateOfflineSyncPaymentProps): Payment {
    return new Payment(
      props.id,
      props.studentId,
      props.merchantId,
      props.cardId,
      props.amount,
      'OFFLINE',
      props.offlineTrxId,
      props.createdAt,
      'COMPLETED',
      null,
      null,
    );
  }

  static restore(props: RestoredPaymentProps): Payment {
    return new Payment(
      props.id,
      props.studentId,
      props.merchantId,
      props.cardId,
      props.amount,
      props.paymentMode,
      props.offlineTrxId,
      props.createdAt,
      props.status ?? 'COMPLETED',
      props.voidedAt ?? null,
      props.voidReason ?? null,
    );
  }
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}


import { DomainError } from '../../../shared/domain-error';

export type SettlementStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';

export interface CreateSettlementProps {
  merchantId: number;
  settlementDate: string;
  grossAmount: string;
  feePercent: string;
  createdAt: Date;
}

export interface RestoredSettlementProps {
  id: number;
  merchantId: number;
  settlementDate: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  status: SettlementStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

export class Settlement {
  private _status: SettlementStatus;
  private _approvedBy: string | null;
  private _approvedAt: Date | null;

  private constructor(
    readonly id: number | null,
    readonly merchantId: number,
    readonly settlementDate: string,
    readonly grossAmount: string,
    readonly feeAmount: string,
    readonly netAmount: string,
    status: SettlementStatus,
    approvedBy: string | null,
    approvedAt: Date | null,
    readonly createdAt: Date,
  ) {
    this._status = status;
    this._approvedBy = approvedBy;
    this._approvedAt = approvedAt;
  }

  get status(): SettlementStatus {
    return this._status;
  }

  get approvedBy(): string | null {
    return this._approvedBy;
  }

  get approvedAt(): Date | null {
    return this._approvedAt;
  }

  approve(staffSubject: string, now: Date): void {
    if (this._status === 'APPROVED') {
      return;
    }

    if (this._status !== 'PENDING_APPROVAL') {
      throw new DomainError(
        'SETTLEMENT_NOT_PENDING',
        'Settlement is not in pending approval state.',
      );
    }

    this._status = 'APPROVED';
    this._approvedBy = staffSubject;
    this._approvedAt = now;
  }

  static create(props: CreateSettlementProps): Settlement {
    const grossCents = parseAmountToCents(props.grossAmount);
    const feeBasisPoints = parsePercentToBasisPoints(props.feePercent);

    // feeAmount = gross * (feePercent / 100) = (grossCents * feeBasisPoints) / 10000
    const feeCentsNumber = Math.round(Number(grossCents * BigInt(feeBasisPoints)) / 10000);
    const feeCents = BigInt(feeCentsNumber);
    const netCents = grossCents - feeCents;

    return new Settlement(
      null,
      props.merchantId,
      props.settlementDate,
      formatCentsToString(grossCents),
      formatCentsToString(feeCents),
      formatCentsToString(netCents),
      'PENDING_APPROVAL',
      null,
      null,
      props.createdAt,
    );
  }

  static restore(props: RestoredSettlementProps): Settlement {
    return new Settlement(
      props.id,
      props.merchantId,
      props.settlementDate,
      props.grossAmount,
      props.feeAmount,
      props.netAmount,
      props.status,
      props.approvedBy,
      props.approvedAt,
      props.createdAt,
    );
  }
}

function parseAmountToCents(amountStr: string): bigint {
  const trimmed = amountStr.trim();
  const [intPart, decPart = ''] = trimmed.split('.');
  const paddedDec = decPart.padEnd(2, '0').slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(paddedDec);
}

function parsePercentToBasisPoints(percentStr: string): number {
  const trimmed = percentStr.trim();
  const num = parseFloat(trimmed);
  return Math.round(num * 100);
}

function formatCentsToString(cents: bigint): string {
  const isNegative = cents < 0n;
  const abs = isNegative ? -cents : cents;
  const integerPart = abs / 100n;
  const decimalPart = (abs % 100n).toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}${integerPart}.${decimalPart}`;
}

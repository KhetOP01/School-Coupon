import { DomainError } from '../../../shared/domain-error';

export type SettlementStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';

export interface CreateSettlementProps {
  merchantId: number;
  settlementDate: string;
  grossAmount: string;
  createdAt: Date;
}

export interface RestoredSettlementProps {
  id: number;
  merchantId: number;
  settlementDate: string;
  grossAmount: string;
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
    const formattedAmount = formatCentsToString(grossCents);

    return new Settlement(
      null,
      props.merchantId,
      props.settlementDate,
      formattedAmount,
      formattedAmount,
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

function formatCentsToString(cents: bigint): string {
  const isNegative = cents < 0n;
  const abs = isNegative ? -cents : cents;
  const integerPart = abs / 100n;
  const decimalPart = (abs % 100n).toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}${integerPart}.${decimalPart}`;
}

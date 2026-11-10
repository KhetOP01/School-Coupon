import { DomainError } from '../../../shared/domain-error';

export class DailyLimitAmount {
  private constructor(private readonly valueInCents: bigint) {}

  static fromString(amountStr: string): DailyLimitAmount {
    if (!amountStr || typeof amountStr !== 'string') {
      throw new DomainError('INVALID_DAILY_LIMIT', 'Daily limit must be a valid amount.');
    }

    const trimmed = amountStr.trim();
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(trimmed)) {
      throw new DomainError('INVALID_DAILY_LIMIT', 'Daily limit must be a non-negative decimal amount with at most 2 decimal places.');
    }

    const [integerPart, decimalPart = ''] = trimmed.split('.');
    const paddedDecimal = decimalPart.padEnd(2, '0');
    const cents = BigInt(integerPart) * 100n + BigInt(paddedDecimal);

    return new DailyLimitAmount(cents);
  }

  toCents(): bigint {
    return this.valueInCents;
  }

  toString(): string {
    const integerPart = this.valueInCents / 100n;
    const decimalPart = (this.valueInCents % 100n).toString().padStart(2, '0');
    return `${integerPart}.${decimalPart}`;
  }
}

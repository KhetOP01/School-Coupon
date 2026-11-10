import { DomainError } from '../../../shared/domain-error';

export class PaymentAmount {
  private constructor(private readonly valueInCents: bigint) {}

  static fromString(amountStr: string): PaymentAmount {
    if (!amountStr || typeof amountStr !== 'string') {
      throw new DomainError('INVALID_PAYMENT_REQUEST', 'Amount must be a valid string.');
    }

    const trimmed = amountStr.trim();
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(trimmed)) {
      throw new DomainError('INVALID_PAYMENT_REQUEST', 'Amount format is invalid.');
    }

    const [integerPart, decimalPart = ''] = trimmed.split('.');
    const paddedDecimal = decimalPart.padEnd(2, '0');
    const cents = BigInt(integerPart) * 100n + BigInt(paddedDecimal);

    if (cents <= 0n) {
      throw new DomainError('INVALID_PAYMENT_REQUEST', 'Amount must be greater than zero.');
    }

    return new PaymentAmount(cents);
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

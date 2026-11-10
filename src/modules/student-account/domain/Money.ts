import { DomainError } from '../../../shared/domain-error';

export class Money {
  private constructor(private readonly minorUnits: bigint) {}

  static zero(): Money {
    return new Money(0n);
  }

  static fromDecimal(value: string): Money {
    const match = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) {
      throw new DomainError('INVALID_TOPUP_AMOUNT');
    }

    const wholeUnits = BigInt(match[2]);
    const fractionalUnits = BigInt((match[3] ?? '').padEnd(2, '0') || '0');
    const sign = match[1] === '-' ? -1n : 1n;
    return new Money(sign * (wholeUnits * 100n + fractionalUnits));
  }

  add(other: Money): Money {
    return new Money(this.minorUnits + other.minorUnits);
  }

  isPositive(): boolean {
    return this.minorUnits > 0n;
  }

  isLessThan(other: Money): Money extends never ? never : boolean {
    return this.minorUnits < other.minorUnits;
  }

  toString(): string {
    const sign = this.minorUnits < 0n ? '-' : '';
    const absoluteUnits = this.minorUnits < 0n ? -this.minorUnits : this.minorUnits;
    const wholeUnits = absoluteUnits / 100n;
    const fractionalUnits = (absoluteUnits % 100n).toString().padStart(2, '0');
    return `${sign}${wholeUnits}.${fractionalUnits}`;
  }
}

import { Money } from './Money';
import { DomainError } from '../../../shared/domain-error';

export class TopUpAmount {
  private constructor(readonly money: Money) {}

  static fromDecimal(
    value: string,
    minimum?: Money,
    maximum?: Money,
  ): TopUpAmount {
    const money = Money.fromDecimal(value);
    if (!money.isPositive()) {
      throw new DomainError('INVALID_TOPUP_AMOUNT');
    }

    if (minimum && money.isLessThan(minimum)) {
      throw new DomainError('INVALID_TOPUP_AMOUNT');
    }

    if (maximum && maximum.isLessThan(money)) {
      throw new DomainError('INVALID_TOPUP_AMOUNT');
    }

    return new TopUpAmount(money);
  }
}

import { Money } from './Money';
import { TopUpAmount } from './TopUpAmount';

export class TopUpPolicy {
  private constructor(
    readonly minimum: Money,
    readonly maximum: Money,
  ) {}

  static fromBounds(minimum: Money, maximum: Money): TopUpPolicy {
    return new TopUpPolicy(minimum, maximum);
  }

  validate(amount: string): TopUpAmount {
    return TopUpAmount.fromDecimal(amount, this.minimum, this.maximum);
  }
}

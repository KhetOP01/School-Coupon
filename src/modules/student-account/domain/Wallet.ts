import { Money } from './Money';
import { TopUpAmount } from './TopUpAmount';

export class Wallet {
  private constructor(private currentBalance: Money) {}

  static open(balance: Money = Money.zero()): Wallet {
    return new Wallet(balance);
  }

  get balance(): Money {
    return this.currentBalance;
  }

  acceptTopUp(amount: TopUpAmount): void {
    this.currentBalance = this.currentBalance.add(amount.money);
  }
}

import { Money } from '../Money';
import { TopUpAmount } from '../TopUpAmount';
import { Wallet } from '../Wallet';

describe('Wallet', () => {
  it('AC3.1: credits the Wallet after a confirmed valid top-up', () => {
    const wallet = Wallet.open(Money.fromDecimal('0.10'));

    wallet.acceptTopUp(TopUpAmount.fromDecimal('100.00'));

    expect(wallet.balance.toString()).toBe('100.10');
  });

  it('AC3.3: offsets a negative Wallet balance with a confirmed top-up', () => {
    const wallet = Wallet.open(Money.fromDecimal('-30.00'));

    wallet.acceptTopUp(TopUpAmount.fromDecimal('100.00'));

    expect(wallet.balance.toString()).toBe('70.00');
  });
});

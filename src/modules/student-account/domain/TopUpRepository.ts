import { Money } from './Money';
import { TopUp } from './TopUp';

export interface TopUpRepository {
  save(topUp: TopUp): Promise<void>;
  confirmAndCredit(topUp: TopUp): Promise<Money>;
}

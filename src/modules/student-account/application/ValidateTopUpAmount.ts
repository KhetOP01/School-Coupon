import { TopUpAmount } from '../domain/TopUpAmount';
import { TopUpPolicyProvider } from './ports';

export class ValidateTopUpAmount {
  constructor(private readonly topUpPolicyProvider: TopUpPolicyProvider) {}

  async execute(amount: string): Promise<TopUpAmount> {
    const policy = await this.topUpPolicyProvider.getTopUpPolicy();
    return policy.validate(amount);
  }
}

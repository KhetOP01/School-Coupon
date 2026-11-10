import { TopUp } from '../domain/TopUp';
import { AuthorizeParentStudentAccess } from './AuthorizeParentStudentAccess';
import { FindStudentForTopUp } from './FindStudentForTopUp';
import { TopUpIdGenerator } from './ports';
import { StartTopUpPayment } from './StartTopUpPayment';
import { ValidateTopUpAmount } from './ValidateTopUpAmount';

export interface TopUpStudentWalletInput {
  readonly parent: { readonly id: string } | null;
  readonly studentId: string;
  readonly amount: string;
}

export type TopUpStudentWalletResult =
  | {
      topUpId: string;
      studentId: string;
      amount: string;
      status: 'pending';
    }
  | {
      topUpId: string;
      studentId: string;
      amount: string;
      status: 'succeeded';
      walletBalance: string;
    };

export class TopUpStudentWallet {
  constructor(
    private readonly authorizeParent: AuthorizeParentStudentAccess,
    private readonly findStudent: FindStudentForTopUp,
    private readonly validateAmount: ValidateTopUpAmount,
    private readonly startPayment: StartTopUpPayment,
    private readonly topUpIds: TopUpIdGenerator,
  ) {}

  async execute(input: TopUpStudentWalletInput): Promise<TopUpStudentWalletResult> {
    await this.authorizeParent.execute({
      parent: input.parent,
      studentId: input.studentId,
    });

    const student = await this.findStudent.execute(input.studentId);
    const amount = await this.validateAmount.execute(input.amount);
    const topUp = TopUp.start(this.topUpIds.next(), student.id, amount);
    const payment = await this.startPayment.execute(topUp);
    const result = {
      topUpId: topUp.id,
      studentId: student.id,
      amount: amount.money.toString(),
    };

    if (payment.status === 'pending') {
      return { ...result, status: 'pending' };
    }

    return {
      ...result,
      status: 'succeeded',
      walletBalance: payment.walletBalance.toString(),
    };
  }
}

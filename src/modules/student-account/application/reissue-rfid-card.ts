import { DomainError } from '../../../shared/domain-error';
import { CardIdGenerator, Clock } from './ports';
import { StudentAccountRepository } from './student-account.repository';

export interface ReissueRfidCardCommand {
  studentId: number;
  expectedCardId: number;
  newRfidUid: string;
}

export interface ReissueRfidCardResult {
  studentId: number;
  replacedCardId: number;
  newCardId: number;
  newRfidUid: string;
  newCardStatus: 'active';
  walletBalance: string;
}

export class ReissueRfidCard {
  constructor(
    private readonly repository: StudentAccountRepository,
    private readonly cardIdGenerator: CardIdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReissueRfidCardCommand): Promise<ReissueRfidCardResult> {
    const student = await this.repository.findForCardReissue(command.studentId);
    if (student === null) {
      throw new DomainError('STUDENT_NOT_FOUND');
    }

    const newCardId = await this.cardIdGenerator.next();
    const reissue = student.reissueCard(
      command.expectedCardId,
      newCardId,
      command.newRfidUid,
      this.clock.now(),
    );
    await this.repository.saveCardReissue(student, reissue);

    return {
      studentId: student.id,
      replacedCardId: reissue.replacedCard.id,
      newCardId: reissue.newCard.id,
      newRfidUid: reissue.newCard.uid,
      newCardStatus: 'active',
      walletBalance: student.walletBalance,
    };
  }
}

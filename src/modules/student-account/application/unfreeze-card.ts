import { DomainError } from '../../../shared/domain-error';
import { Clock } from '../../../shared/clock';
import { StudentAccountRepository } from './student-account.repository';

export interface UnfreezeCardCommand {
  cardId: number;
}

export interface UnfreezeCardResult {
  cardId: number;
  studentId: number;
  rfidUid: string;
  status: 'active';
  updatedAt: string;
}

export class UnfreezeCardUseCase {
  constructor(
    private readonly repository: StudentAccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: UnfreezeCardCommand): Promise<UnfreezeCardResult> {
    const student = await this.repository.findByCardId(command.cardId);
    if (student === null) {
      throw new DomainError('CARD_NOT_FOUND');
    }

    const card = student.unfreezeCard(command.cardId);
    const now = this.clock.now();
    await this.repository.saveCardStatus(card, now);

    return {
      cardId: card.id,
      studentId: student.id,
      rfidUid: card.uid,
      status: 'active',
      updatedAt: now.toISOString(),
    };
  }
}

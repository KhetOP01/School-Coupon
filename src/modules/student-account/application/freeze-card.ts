import { DomainError } from '../../../shared/domain-error';
import { Clock } from '../../../shared/clock';
import { StudentAccountRepository } from './student-account.repository';

export interface FreezeCardCommand {
  cardId: number;
  targetStatus: 'suspended' | 'lost';
}

export interface FreezeCardResult {
  cardId: number;
  studentId: number;
  rfidUid: string;
  status: 'suspended' | 'lost';
  updatedAt: string;
}

export class FreezeCardUseCase {
  constructor(
    private readonly repository: StudentAccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: FreezeCardCommand): Promise<FreezeCardResult> {
    const student = await this.repository.findByCardId(command.cardId);
    if (student === null) {
      throw new DomainError('CARD_NOT_FOUND');
    }

    const card = student.freezeCard(command.cardId, command.targetStatus);
    const now = this.clock.now();
    await this.repository.saveCardStatus(card, now);

    return {
      cardId: card.id,
      studentId: student.id,
      rfidUid: card.uid,
      status: card.status as 'suspended' | 'lost',
      updatedAt: now.toISOString(),
    };
  }
}

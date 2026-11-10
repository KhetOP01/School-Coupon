import { DomainError } from '../../../shared/domain-error';
import { RfidCard } from './rfid-card';

export interface RestoredStudent {
  id: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  walletBalance: string;
  currentCard: RfidCard | null;
}

export interface CardReissuePreview {
  studentId: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  expectedCardId: number;
  oldRfidUid: string;
  oldCardStatus: 'active' | 'lost';
  walletBalance: string;
}

export interface CardReissue {
  replacedCard: RfidCard;
  newCard: RfidCard;
}

export class Student {
  private constructor(
    readonly id: number,
    readonly studentCode: string,
    readonly firstName: string,
    readonly lastName: string,
    readonly walletBalance: string,
    private activeCard: RfidCard | null,
  ) {}

  static restore(student: RestoredStudent): Student {
    return new Student(
      student.id,
      student.studentCode,
      student.firstName,
      student.lastName,
      student.walletBalance,
      student.currentCard,
    );
  }

  get currentCard(): RfidCard | null {
    return this.activeCard;
  }

  cardReissuePreview(): CardReissuePreview {
    const card = this.activeCard;
    if (card === null || (card.status !== 'active' && card.status !== 'lost')) {
      throw new DomainError('CARD_NOT_REPLACEABLE');
    }

    return {
      studentId: this.id,
      studentCode: this.studentCode,
      firstName: this.firstName,
      lastName: this.lastName,
      expectedCardId: card.id,
      oldRfidUid: card.uid,
      oldCardStatus: card.status,
      walletBalance: this.walletBalance,
    };
  }

  reissueCard(
    expectedCardId: number,
    newCardId: number,
    newRfidUid: string,
    now: Date,
  ): CardReissue {
    const replacedCard = this.activeCard;
    if (
      replacedCard === null ||
      replacedCard.id !== expectedCardId ||
      (replacedCard.status !== 'active' && replacedCard.status !== 'lost')
    ) {
      throw new DomainError('CARD_NOT_REPLACEABLE');
    }

    const newCard = RfidCard.issue(newCardId, newRfidUid, now);
    replacedCard.deactivate();
    this.activeCard = newCard;
    return { replacedCard, newCard };
  }
}

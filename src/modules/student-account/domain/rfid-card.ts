import { DomainError } from '../../../shared/domain-error';

export type RfidCardStatus = 'active' | 'suspended' | 'lost' | 'deactivated';

export interface RestoredRfidCard {
  id: number;
  uid: string;
  status: RfidCardStatus;
  issuedAt: Date;
}

export class RfidCard {
  private constructor(
    readonly id: number,
    readonly uid: string,
    private currentStatus: RfidCardStatus,
    readonly issuedAt: Date,
  ) {}

  static restore(card: RestoredRfidCard): RfidCard {
    return new RfidCard(card.id, card.uid, card.status, card.issuedAt);
  }

  static issue(id: number, uid: string, issuedAt: Date): RfidCard {
    if (!Number.isInteger(id) || id < 1) {
      throw new DomainError('INVALID_REQUEST');
    }

    return new RfidCard(id, uid, 'active', issuedAt);
  }

  get status(): RfidCardStatus {
    return this.currentStatus;
  }

  deactivate(): void {
    if (this.currentStatus !== 'active' && this.currentStatus !== 'lost') {
      throw new DomainError('CARD_NOT_REPLACEABLE');
    }

    this.currentStatus = 'deactivated';
  }

  suspend(): void {
    if (this.currentStatus !== 'active') {
      throw new DomainError('CARD_CANNOT_BE_FROZEN');
    }

    this.currentStatus = 'suspended';
  }

  reportLost(): void {
    if (this.currentStatus === 'deactivated') {
      throw new DomainError('CARD_CANNOT_BE_FROZEN');
    }

    this.currentStatus = 'lost';
  }

  unfreeze(): void {
    if (this.currentStatus !== 'suspended') {
      throw new DomainError('CARD_NOT_SUSPENDED');
    }

    this.currentStatus = 'active';
  }
}


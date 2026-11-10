import { Clock } from '../../../shared/clock';
import { DomainError } from '../../../shared/domain-error';
import { Settlement } from '../domain/Settlement';
import { SettlementRepository } from './ports';

export interface ApproveSettlementCommand {
  readonly settlementId: number;
  readonly staffSubject: string;
}

export class ApproveSettlement {
  constructor(
    private readonly settlementRepo: SettlementRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: ApproveSettlementCommand): Promise<Settlement> {
    const settlement = await this.settlementRepo.findSettlementById(
      command.settlementId,
    );

    if (!settlement) {
      throw new DomainError('SETTLEMENT_NOT_FOUND', 'Settlement not found.');
    }

    settlement.approve(command.staffSubject, this.clock.now());

    return this.settlementRepo.saveApprovedSettlement(settlement);
  }
}

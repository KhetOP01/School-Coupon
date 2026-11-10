import { Clock } from '../../../shared/clock';
import { Settlement } from '../domain/Settlement';
import { MerchantSalesGateway, SettlementRepository } from './ports';

export interface GenerateDailySettlementsCommand {
  readonly settlementDate: string; // 'YYYY-MM-DD'
}

export interface GenerateDailySettlementsResult {
  readonly settlementDate: string;
  readonly createdCount: number;
  readonly skippedCount: number;
}

export class GenerateDailySettlements {
  constructor(
    private readonly salesGateway: MerchantSalesGateway,
    private readonly settlementRepo: SettlementRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: GenerateDailySettlementsCommand,
  ): Promise<GenerateDailySettlementsResult> {
    const sales = await this.salesGateway.getDailySalesByMerchant(
      command.settlementDate,
    );

    let createdCount = 0;
    let skippedCount = 0;

    for (const sale of sales) {
      const existing = await this.settlementRepo.findSettlementByMerchantAndDate(
        sale.merchantId,
        command.settlementDate,
      );

      if (existing) {
        skippedCount++;
        continue;
      }

      const settlement = Settlement.create({
        merchantId: sale.merchantId,
        settlementDate: command.settlementDate,
        grossAmount: sale.grossAmount,
        feePercent: sale.feePercent,
        createdAt: this.clock.now(),
      });

      await this.settlementRepo.saveSettlement(settlement);
      createdCount++;
    }

    return {
      settlementDate: command.settlementDate,
      createdCount,
      skippedCount,
    };
  }
}

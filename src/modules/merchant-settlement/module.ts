import { Module } from '@nestjs/common';
import { SystemClock } from '../../shared/clock';
import { PostgresDatabase } from '../../shared/postgres-database';
import { SchoolConfigurationModule } from '../school-configuration';
import { StaffAuthGuard } from '../student-account/interface/http/staff-auth.guard';
import { ApproveSettlement } from './application/ApproveSettlement';
import { GenerateDailySettlements } from './application/GenerateDailySettlements';
import { PostgresMerchantSalesGateway } from './infrastructure/PostgresMerchantSalesGateway';
import { PostgresSettlementRepository } from './infrastructure/PostgresSettlementRepository';
import { SettlementController } from './interface/http/settlement.controller';

export const SETTLEMENT_REPOSITORY = Symbol('SETTLEMENT_REPOSITORY');
export const MERCHANT_SALES_GATEWAY = Symbol('MERCHANT_SALES_GATEWAY');

@Module({
  imports: [SchoolConfigurationModule],
  controllers: [SettlementController],
  providers: [
    PostgresDatabase,
    SystemClock,
    StaffAuthGuard,
    {
      provide: SETTLEMENT_REPOSITORY,
      useFactory: (db: PostgresDatabase) => new PostgresSettlementRepository(db.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: MERCHANT_SALES_GATEWAY,
      useFactory: (db: PostgresDatabase) => new PostgresMerchantSalesGateway(db.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: ApproveSettlement,
      useFactory: (
        settlementRepo: PostgresSettlementRepository,
        clock: SystemClock,
      ) => new ApproveSettlement(settlementRepo, clock),
      inject: [SETTLEMENT_REPOSITORY, SystemClock],
    },
    {
      provide: GenerateDailySettlements,
      useFactory: (
        salesGateway: PostgresMerchantSalesGateway,
        settlementRepo: PostgresSettlementRepository,
        clock: SystemClock,
      ) => new GenerateDailySettlements(salesGateway, settlementRepo, clock),
      inject: [MERCHANT_SALES_GATEWAY, SETTLEMENT_REPOSITORY, SystemClock],
    },
  ],
  exports: [SETTLEMENT_REPOSITORY, GenerateDailySettlements, ApproveSettlement],
})
export class MerchantSettlementModule {}

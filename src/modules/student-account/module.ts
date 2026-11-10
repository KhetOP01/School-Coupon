import { Module } from '@nestjs/common';
import { SystemClock } from '../../shared/clock';
import { PostgresDatabase } from '../../shared/postgres-database';
import { SchoolConfigurationModule } from '../school-configuration';
import { GetCardReissuePreview } from './application/get-card-reissue-preview';
import { ReissueRfidCard } from './application/reissue-rfid-card';
import { CardIdGenerator } from './application/ports';
import { StudentAccountRepository } from './application/student-account.repository';
import { PostgresCardIdGenerator } from './infrastructure/postgres-card-id-generator';
import { StudentAccountPostgresRepository } from './infrastructure/student-account-postgres.repository';
import { CardReissuePreviewController } from './interface/http/card-reissue-preview.controller';
import { StaffAuthGuard } from './interface/http/staff-auth.guard';
import { ReissueRfidCardController } from './interface/http/reissue-rfid-card.controller';

export const STUDENT_ACCOUNT_REPOSITORY = Symbol('STUDENT_ACCOUNT_REPOSITORY');
export const CARD_ID_GENERATOR = Symbol('CARD_ID_GENERATOR');

@Module({
  imports: [SchoolConfigurationModule],
  controllers: [ReissueRfidCardController, CardReissuePreviewController],
  providers: [
    PostgresDatabase,
    StaffAuthGuard,
    SystemClock,
    {
      provide: STUDENT_ACCOUNT_REPOSITORY,
      useFactory: (database: PostgresDatabase): StudentAccountRepository =>
        new StudentAccountPostgresRepository(database.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: CARD_ID_GENERATOR,
      useFactory: (database: PostgresDatabase): CardIdGenerator =>
        new PostgresCardIdGenerator(database.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: ReissueRfidCard,
      useFactory: (
        repository: StudentAccountRepository,
        cardIdGenerator: CardIdGenerator,
        clock: SystemClock,
      ): ReissueRfidCard => new ReissueRfidCard(repository, cardIdGenerator, clock),
      inject: [STUDENT_ACCOUNT_REPOSITORY, CARD_ID_GENERATOR, SystemClock],
    },
    {
      provide: GetCardReissuePreview,
      useFactory: (repository: StudentAccountRepository): GetCardReissuePreview =>
        new GetCardReissuePreview(repository),
      inject: [STUDENT_ACCOUNT_REPOSITORY],
    },
  ],
})
export class StudentAccountModule {}

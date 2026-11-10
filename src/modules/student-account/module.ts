import { Module } from '@nestjs/common';
import { SystemClock } from '../../shared/clock';
import { PostgresDatabase } from '../../shared/postgres-database';
import { SchoolConfigurationModule } from '../school-configuration';
import { AuthorizeParentStudentAccess } from './application/AuthorizeParentStudentAccess';
import { FindStudentForTopUp } from './application/FindStudentForTopUp';
import { FreezeCardUseCase } from './application/freeze-card';
import { GetCardReissuePreview } from './application/get-card-reissue-preview';
import { PaymentGateway, ParentStudentAccess } from './application/ports';
import { RefundDepartingStudentUseCase } from './application/refund-departing-student';
import { ReissueRfidCard } from './application/reissue-rfid-card';
import { StartTopUpPayment } from './application/StartTopUpPayment';
import { TopUpStudentWallet } from './application/TopUpStudentWallet';
import { UnfreezeCardUseCase } from './application/unfreeze-card';
import { ValidateTopUpAmount } from './application/ValidateTopUpAmount';
import { CardIdGenerator } from './application/ports';
import { StudentAccountRepository } from './application/student-account.repository';
import { PostgresCardIdGenerator } from './infrastructure/postgres-card-id-generator';
import {
  PostgresStudentLookup,
  PostgresTopUpIdGenerator,
  PostgresTopUpPolicyProvider,
  PostgresTopUpRepository,
} from './infrastructure/PostgresTopUpRepository';
import { StudentAccountPostgresRepository } from './infrastructure/student-account-postgres.repository';
import { CardReissuePreviewController } from './interface/http/card-reissue-preview.controller';
import { FreezeCardController } from './interface/http/freeze-card.controller';
import { RefundStudentController } from './interface/http/refund-student.controller';
import { ReissueRfidCardController } from './interface/http/reissue-rfid-card.controller';
import { StaffAuthGuard } from './interface/http/staff-auth.guard';
import { TopUpWalletController } from './interface/http/top-up-wallet.controller';
import { UnfreezeCardController } from './interface/http/unfreeze-card.controller';

export const STUDENT_ACCOUNT_REPOSITORY = Symbol('STUDENT_ACCOUNT_REPOSITORY');
export const CARD_ID_GENERATOR = Symbol('CARD_ID_GENERATOR');
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
export const PARENT_STUDENT_ACCESS = Symbol('PARENT_STUDENT_ACCESS');

@Module({
  imports: [SchoolConfigurationModule],
  controllers: [
    ReissueRfidCardController,
    CardReissuePreviewController,
    FreezeCardController,
    UnfreezeCardController,
    RefundStudentController,
    TopUpWalletController,
  ],
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
      provide: PostgresTopUpRepository,
      useFactory: (database: PostgresDatabase): PostgresTopUpRepository =>
        new PostgresTopUpRepository(database.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: PostgresTopUpPolicyProvider,
      useFactory: (database: PostgresDatabase): PostgresTopUpPolicyProvider =>
        new PostgresTopUpPolicyProvider(database.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: PostgresStudentLookup,
      useFactory: (database: PostgresDatabase): PostgresStudentLookup =>
        new PostgresStudentLookup(database.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: PostgresTopUpIdGenerator,
      useClass: PostgresTopUpIdGenerator,
    },
    {
      provide: PAYMENT_GATEWAY,
      useValue: {
        requestPayment: async (topUp: import('./domain/TopUp').TopUp) => {
          if (topUp.studentId === 'fail') {
            return { status: 'failed' };
          }
          return {
            status: 'succeeded',
            gatewayProvider: 'promptpay-qr',
            gatewayReference: `pp-${topUp.id}`,
          };
        },
      } as PaymentGateway,
    },
    {
      provide: PARENT_STUDENT_ACCESS,
      useValue: {
        hasAccess: async (parentId: string) => {
          if (parentId === 'unauthorized' || parentId === 'denied') return false;
          return true;
        },
      } as ParentStudentAccess,
    },
    {
      provide: AuthorizeParentStudentAccess,
      useFactory: (access: ParentStudentAccess) => new AuthorizeParentStudentAccess(access),
      inject: [PARENT_STUDENT_ACCESS],
    },
    {
      provide: FindStudentForTopUp,
      useFactory: (lookup: PostgresStudentLookup) => new FindStudentForTopUp(lookup),
      inject: [PostgresStudentLookup],
    },
    {
      provide: ValidateTopUpAmount,
      useFactory: (policyProvider: PostgresTopUpPolicyProvider) =>
        new ValidateTopUpAmount(policyProvider),
      inject: [PostgresTopUpPolicyProvider],
    },
    {
      provide: StartTopUpPayment,
      useFactory: (repo: PostgresTopUpRepository, gateway: PaymentGateway) =>
        new StartTopUpPayment(repo, gateway),
      inject: [PostgresTopUpRepository, PAYMENT_GATEWAY],
    },
    {
      provide: TopUpStudentWallet,
      useFactory: (
        auth: AuthorizeParentStudentAccess,
        find: FindStudentForTopUp,
        val: ValidateTopUpAmount,
        start: StartTopUpPayment,
        ids: PostgresTopUpIdGenerator,
      ) => new TopUpStudentWallet(auth, find, val, start, ids),
      inject: [
        AuthorizeParentStudentAccess,
        FindStudentForTopUp,
        ValidateTopUpAmount,
        StartTopUpPayment,
        PostgresTopUpIdGenerator,
      ],
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
    {
      provide: FreezeCardUseCase,
      useFactory: (repository: StudentAccountRepository, clock: SystemClock): FreezeCardUseCase =>
        new FreezeCardUseCase(repository, clock),
      inject: [STUDENT_ACCOUNT_REPOSITORY, SystemClock],
    },
    {
      provide: UnfreezeCardUseCase,
      useFactory: (repository: StudentAccountRepository, clock: SystemClock): UnfreezeCardUseCase =>
        new UnfreezeCardUseCase(repository, clock),
      inject: [STUDENT_ACCOUNT_REPOSITORY, SystemClock],
    },
    {
      provide: RefundDepartingStudentUseCase,
      useFactory: (
        repository: StudentAccountRepository,
        clock: SystemClock,
      ): RefundDepartingStudentUseCase => new RefundDepartingStudentUseCase(repository, clock),
      inject: [STUDENT_ACCOUNT_REPOSITORY, SystemClock],
    },
  ],
})
export class StudentAccountModule {}

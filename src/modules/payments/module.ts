import { Module } from '@nestjs/common';
import { SystemClock } from '../../shared/clock';
import { PostgresDatabase } from '../../shared/postgres-database';
import { ProcessOnlinePayment } from './application/ProcessOnlinePayment';
import { SyncOfflinePayment } from './application/SyncOfflinePayment';
import { PostgresMerchantGateway } from './infrastructure/PostgresMerchantGateway';
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository';
import { PostgresStudentPaymentGateway } from './infrastructure/PostgresStudentPaymentGateway';
import { MerchantPaymentController } from './interface/http/merchant-payment.controller';

export const MERCHANT_GATEWAY = Symbol('MERCHANT_GATEWAY');
export const STUDENT_PAYMENT_GATEWAY = Symbol('STUDENT_PAYMENT_GATEWAY');
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

@Module({
  controllers: [MerchantPaymentController],
  providers: [
    PostgresDatabase,
    SystemClock,
    {
      provide: MERCHANT_GATEWAY,
      useFactory: (db: PostgresDatabase) => new PostgresMerchantGateway(db.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: STUDENT_PAYMENT_GATEWAY,
      useFactory: (db: PostgresDatabase) => new PostgresStudentPaymentGateway(db.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: PAYMENT_REPOSITORY,
      useFactory: (db: PostgresDatabase) => new PostgresPaymentRepository(db.pool),
      inject: [PostgresDatabase],
    },
    {
      provide: ProcessOnlinePayment,
      useFactory: (
        merchantGateway: PostgresMerchantGateway,
        studentGateway: PostgresStudentPaymentGateway,
        paymentRepository: PostgresPaymentRepository,
        clock: SystemClock,
      ) => new ProcessOnlinePayment(merchantGateway, studentGateway, paymentRepository, clock),
      inject: [MERCHANT_GATEWAY, STUDENT_PAYMENT_GATEWAY, PAYMENT_REPOSITORY, SystemClock],
    },
    {
      provide: SyncOfflinePayment,
      useFactory: (
        merchantGateway: PostgresMerchantGateway,
        studentGateway: PostgresStudentPaymentGateway,
        paymentRepository: PostgresPaymentRepository,
        clock: SystemClock,
      ) => new SyncOfflinePayment(merchantGateway, studentGateway, paymentRepository, clock),
      inject: [MERCHANT_GATEWAY, STUDENT_PAYMENT_GATEWAY, PAYMENT_REPOSITORY, SystemClock],
    },
  ],
  exports: [PAYMENT_REPOSITORY],
})
export class PaymentsModule {}

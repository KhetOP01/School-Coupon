import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MerchantSettlementModule } from './modules/merchant-settlement';
import { PaymentsModule } from './modules/payments';
import { StudentAccountModule } from './modules/student-account';

@Module({
  imports: [StudentAccountModule, PaymentsModule, MerchantSettlementModule],
  controllers: [AppController],
})
export class AppModule {}

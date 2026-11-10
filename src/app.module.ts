import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PaymentsModule } from './modules/payments';
import { StudentAccountModule } from './modules/student-account';

@Module({
  imports: [StudentAccountModule, PaymentsModule],
  controllers: [AppController],
})
export class AppModule {}

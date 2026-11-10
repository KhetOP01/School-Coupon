import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { StudentAccountModule } from './modules/student-account';

@Module({
  imports: [StudentAccountModule],
  controllers: [AppController],
})
export class AppModule {}

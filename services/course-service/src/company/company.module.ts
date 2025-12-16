import { Module } from '@nestjs/common';
import { CompanyService } from './service/company.service';
import { CompanyNatsController } from './controller/company-nats.controller';

@Module({
  controllers: [CompanyNatsController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}

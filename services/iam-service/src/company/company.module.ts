import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyNatsController } from './company-nats.controller';

@Module({
  imports: [],
  controllers: [CompanyNatsController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}

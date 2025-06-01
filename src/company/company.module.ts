import { Module } from '@nestjs/common';
import { GolfCompanyService } from './service/golf-company.service';
import { GolfCompanyController } from './controller/golf-company.controller';

@Module({
  controllers: [GolfCompanyController],
  providers: [GolfCompanyService],
})
export class CompanyModule {}

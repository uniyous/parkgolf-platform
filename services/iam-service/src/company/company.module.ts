import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyNatsController } from './company-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyNatsController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}

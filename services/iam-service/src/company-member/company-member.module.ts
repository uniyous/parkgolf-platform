import { Module } from '@nestjs/common';
import { CompanyMemberService } from './company-member.service';
import { CompanyMemberNatsController } from './company-member-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyMemberNatsController],
  providers: [CompanyMemberService],
  exports: [CompanyMemberService],
})
export class CompanyMemberModule {}

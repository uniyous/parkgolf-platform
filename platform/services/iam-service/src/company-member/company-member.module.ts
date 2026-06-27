import { Module } from '@nestjs/common';
import { CompanyMemberService } from './company-member.service';
import { CompanyMemberNatsController } from './company-member-nats.controller';

@Module({
  imports: [],
  controllers: [CompanyMemberNatsController],
  providers: [CompanyMemberService],
  exports: [CompanyMemberService],
})
export class CompanyMemberModule {}

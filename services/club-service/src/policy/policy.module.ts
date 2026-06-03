import { Module } from '@nestjs/common';
import { PolicyNatsController } from './controller/policy-nats.controller';
import { PolicyService } from './service/policy.service';

@Module({
  controllers: [PolicyNatsController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}

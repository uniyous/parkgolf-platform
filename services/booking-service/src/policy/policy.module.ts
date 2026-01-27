import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PolicyNatsController } from './controller/policy-nats.controller';
import { PolicyService } from './service/policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [PolicyNatsController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}

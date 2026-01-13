import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PolicyController } from './controller/policy.controller';
import { PolicyService } from './service/policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [PolicyController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}

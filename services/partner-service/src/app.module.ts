import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { PartnerModule } from './partner/partner.module';
import { ClientModule } from './client/client.module';
import { MockModule } from './mock/mock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    PrismaModule,
    ClientModule,
    PartnerModule,
    MockModule,
  ],
})
export class AppModule {}

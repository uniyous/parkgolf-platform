import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NATS_CLIENT_OPTIONS } from '../shared/nats';

/**
 * Auth Module
 */
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
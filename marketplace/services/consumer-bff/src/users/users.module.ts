import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { NatsModule } from '../common/nats';

@Module({
  imports: [NatsModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { RoomModule } from './room/room.module';
import { DrizzleModule } from './db/drizzle.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    CommonModule,
    DrizzleModule,
    RoomModule,
    ChatModule,
  ],
})
export class AppModule {}

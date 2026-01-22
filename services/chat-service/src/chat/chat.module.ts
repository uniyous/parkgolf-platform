import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatNatsController } from './chat-nats.controller';

@Module({
  controllers: [ChatNatsController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

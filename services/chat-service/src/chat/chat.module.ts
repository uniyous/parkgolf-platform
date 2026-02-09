import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatNatsController } from './chat-nats.controller';
import { JetStreamConsumerService } from './jetstream-consumer.service';

@Module({
  controllers: [ChatNatsController],
  providers: [ChatService, JetStreamConsumerService],
  exports: [ChatService],
})
export class ChatModule {}

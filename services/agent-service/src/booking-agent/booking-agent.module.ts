import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeepSeekService } from './service/deepseek.service';
import { ToolExecutorService } from './service/tool-executor.service';
import { ConversationService } from './service/conversation.service';
import { BookingAgentService } from './service/booking-agent.service';
import { BookingAgentNatsController } from './controller/booking-agent-nats.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BookingAgentNatsController],
  providers: [
    DeepSeekService,
    ToolExecutorService,
    ConversationService,
    BookingAgentService,
  ],
  exports: [BookingAgentService],
})
export class BookingAgentModule {}

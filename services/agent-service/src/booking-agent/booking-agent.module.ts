import { Module } from '@nestjs/common';
import { DeepSeekService } from './service/deepseek.service';
import { ToolExecutorService } from './service/tool-executor.service';
import { ConversationService } from './service/conversation.service';
import { BookingAgentService } from './service/booking-agent.service';
import { LlmOrchestratorService } from './service/llm-orchestrator.service';
import { MessageContextExtractor } from './service/message-context.extractor';
import { UiCardHelper } from './service/ui-card.helper';
import { BookingCompletionService } from './service/booking-completion.service';
import { GroupBookingService } from './service/group-booking.service';
import { PaymentResultHandlerService } from './service/payment-result-handler.service';
import { DirectActionHandlerService } from './service/direct-action-handler.service';
import { UserMemoryService } from './service/user-memory.service';
import { BookingAgentNatsController } from './controller/booking-agent-nats.controller';

@Module({
  controllers: [BookingAgentNatsController],
  providers: [
    DeepSeekService,
    ToolExecutorService,
    ConversationService,
    LlmOrchestratorService,
    MessageContextExtractor,
    UiCardHelper,
    BookingCompletionService,
    GroupBookingService,
    PaymentResultHandlerService,
    DirectActionHandlerService,
    UserMemoryService,
    BookingAgentService,
  ],
  exports: [BookingAgentService],
})
export class BookingAgentModule {}

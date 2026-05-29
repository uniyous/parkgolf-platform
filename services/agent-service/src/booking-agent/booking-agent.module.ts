import { Module } from '@nestjs/common';
import { DeepSeekService } from './service/deepseek.service';
import { ToolExecutorService } from './service/tool-executor.service';
import { ConversationService } from './service/conversation.service';
import { BookingAgentService } from './service/booking-agent.service';
import { LlmOrchestratorService } from './service/llm-orchestrator.service';
import { UiCardHelper } from './service/ui-card.helper';
import { BookingCompletionService } from './service/booking-completion.service';
import { GroupBookingService } from './service/group-booking.service';
import { PaymentResultHandlerService } from './service/payment-result-handler.service';
import { DirectActionHandlerService } from './service/direct-action-handler.service';
import { EffectExecutorService } from './service/effect-executor.service';
import { TurnJournalService } from './service/turn-journal.service';
import { UserMemoryService } from './service/user-memory.service';
import { SearchTools } from './service/tools/search.tools';
import { WeatherTools } from './service/tools/weather.tools';
import { BookingTools } from './service/tools/booking.tools';
import { SocialTools } from './service/tools/social.tools';
import { PaymentTools } from './service/tools/payment.tools';
import { NotificationTools } from './service/tools/notification.tools';
import { BookingAgentNatsController } from './controller/booking-agent-nats.controller';

@Module({
  controllers: [BookingAgentNatsController],
  providers: [
    DeepSeekService,
    SearchTools,
    WeatherTools,
    BookingTools,
    SocialTools,
    PaymentTools,
    NotificationTools,
    ToolExecutorService,
    ConversationService,
    LlmOrchestratorService,
    UiCardHelper,
    BookingCompletionService,
    GroupBookingService,
    PaymentResultHandlerService,
    DirectActionHandlerService,
    EffectExecutorService,
    TurnJournalService,
    UserMemoryService,
    BookingAgentService,
  ],
  exports: [BookingAgentService],
})
export class BookingAgentModule {}

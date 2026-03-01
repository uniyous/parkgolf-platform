import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingAgentService } from '../service/booking-agent.service';
import { ConversationService } from '../service/conversation.service';
import { ChatRequestDto, ChatResponseDto, ResetRequestDto } from '../dto/chat.dto';

/**
 * NATS 응답 헬퍼
 */
const NatsResponse = {
  success: <T>(data: T) => ({ success: true, data }),
  error: (code: string, message: string) => ({
    success: false,
    error: { code, message },
  }),
};

/**
 * 예약 에이전트 NATS 컨트롤러
 */
@Controller()
export class BookingAgentNatsController {
  private readonly logger = new Logger(BookingAgentNatsController.name);

  constructor(
    private readonly agentService: BookingAgentService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * 채팅 메시지 처리
   * Pattern: agent.chat
   */
  @MessagePattern('agent.chat')
  async chat(@Payload() data: ChatRequestDto) {
    this.logger.debug(`Chat request from user: ${data.userId}`);

    try {
      const response = await this.agentService.chat(data);
      return NatsResponse.success(response);
    } catch (error) {
      this.logger.error('Chat failed', error);
      return NatsResponse.error('CHAT_ERROR', 'Failed to process chat message');
    }
  }

  /**
   * 대화 리셋
   * Pattern: agent.reset
   */
  @MessagePattern('agent.reset')
  async reset(@Payload() data: ResetRequestDto) {
    this.logger.debug(`Reset conversation for user: ${data.userId}`);

    try {
      const response = this.agentService.resetConversation(data.userId);
      return NatsResponse.success(response);
    } catch (error) {
      this.logger.error('Reset failed', error);
      return NatsResponse.error('RESET_ERROR', 'Failed to reset conversation');
    }
  }

  /**
   * 대화 상태 조회
   * Pattern: agent.status
   */
  @MessagePattern('agent.status')
  async getStatus(@Payload() data: { userId: number; conversationId: string }) {
    this.logger.debug(`Status request: ${data.conversationId}`);

    try {
      const context = this.conversationService.get(data.userId, data.conversationId);

      if (!context) {
        return NatsResponse.error('NOT_FOUND', 'Conversation not found');
      }

      return NatsResponse.success({
        conversationId: context.conversationId,
        state: context.state,
        slots: context.slots,
        messageCount: context.messages.length,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
      });
    } catch (error) {
      this.logger.error('Status check failed', error);
      return NatsResponse.error('STATUS_ERROR', 'Failed to get conversation status');
    }
  }

  /**
   * 서비스 통계 (헬스체크/디버깅용)
   * Pattern: agent.stats
   */
  @MessagePattern('agent.stats')
  async getStats() {
    try {
      const stats = this.conversationService.getStats();
      return NatsResponse.success({
        ...stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return NatsResponse.error('STATS_ERROR', 'Failed to get stats');
    }
  }

}

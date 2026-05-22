import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingAgentService } from '../service/booking-agent.service';
import { ConversationService } from '../service/conversation.service';
import { UserMemoryService } from '../service/user-memory.service';
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
    private readonly userMemoryService: UserMemoryService,
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
  async reset(@Payload() data: ResetRequestDto & { conversationId?: string }) {
    this.logger.debug(`Reset conversation for user: ${data.userId}`);

    try {
      const response = await this.agentService.resetConversation(data.userId, data.conversationId);
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
      const context = await this.conversationService.load(data.userId, data.conversationId);

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
      const stats = await this.conversationService.getStats();
      return NatsResponse.success({
        ...stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return NatsResponse.error('STATS_ERROR', 'Failed to get stats');
    }
  }

  // ─── Phase 3 — Semantic Memory (UNI-20 프라이버시 토글) ──────

  /**
   * 사용자 메모리 조회 (프라이버시 토글 상태 + 요약)
   * Pattern: agent.memory.get
   */
  @MessagePattern('agent.memory.get')
  async getMemory(@Payload() data: { userId: number }) {
    try {
      const snapshot = await this.userMemoryService.get(data.userId);
      if (!snapshot) {
        // 미존재 사용자도 default(enabled=true) 응답 — 클라이언트 토글 초기값
        return NatsResponse.success({
          userId: data.userId,
          enabled: true,
          hasMemory: false,
          summary: null,
        });
      }
      const profile = this.userMemoryService.formatProfile(snapshot);
      return NatsResponse.success({
        userId: snapshot.userId,
        enabled: snapshot.enabled,
        hasMemory: true,
        summary: profile,
        favoriteClubsCount: snapshot.favoriteClubs.length,
        frequentTeammatesCount: snapshot.frequentTeammates.length,
      });
    } catch (error) {
      this.logger.error('getMemory failed', error);
      return NatsResponse.error('MEMORY_GET_ERROR', 'Failed to get user memory');
    }
  }

  /**
   * 사용자 메모리 프라이버시 토글
   * Pattern: agent.memory.setEnabled
   * 기본값 ON (사용자가 명시적으로 OFF로 변경 가능)
   */
  @MessagePattern('agent.memory.setEnabled')
  async setMemoryEnabled(@Payload() data: { userId: number; enabled: boolean }) {
    try {
      await this.userMemoryService.setEnabled(data.userId, !!data.enabled);
      this.logger.log(`Memory toggle: user=${data.userId} enabled=${data.enabled}`);
      return NatsResponse.success({ userId: data.userId, enabled: !!data.enabled });
    } catch (error) {
      this.logger.error('setMemoryEnabled failed', error);
      return NatsResponse.error('MEMORY_SET_ERROR', 'Failed to update memory toggle');
    }
  }

  /**
   * 사용자 메모리 전체 삭제 (계정 삭제 정책 연계)
   * Pattern: agent.memory.deleteByUser
   */
  @MessagePattern('agent.memory.deleteByUser')
  async deleteMemoryByUser(@Payload() data: { userId: number }) {
    try {
      await this.userMemoryService.deleteByUser(data.userId);
      this.logger.log(`Memory deleted for user=${data.userId}`);
      return NatsResponse.success({ userId: data.userId, deleted: true });
    } catch (error) {
      this.logger.error('deleteMemoryByUser failed', error);
      return NatsResponse.error('MEMORY_DELETE_ERROR', 'Failed to delete user memory');
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConversationService, ConversationBusyError } from './conversation.service';
import { LlmOrchestratorService } from './llm-orchestrator.service';
import { GroupBookingService } from './group-booking.service';
import { PaymentResultHandlerService } from './payment-result-handler.service';
import { DirectActionHandlerService } from './direct-action-handler.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatAction,
} from '../dto/chat.dto';

/**
 * 예약 에이전트 라우터.
 * request flag별로 적절한 핸들러로 위임 후, LLM 처리 결과를 응답으로 조립.
 */
@Injectable()
export class BookingAgentService {
  private readonly logger = new Logger(BookingAgentService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly llmOrchestrator: LlmOrchestratorService,
    private readonly groupBooking: GroupBookingService,
    private readonly paymentResult: PaymentResultHandlerService,
    private readonly directAction: DirectActionHandlerService,
  ) {}

  /**
   * 채팅 진입점.
   * - request flag(send/finish/teamMembers/...)가 있으면 직접 핸들러 → return
   * - 없으면 LLM 처리 → return
   */
  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    const { userId, conversationId } = request;
    const convId = conversationId ?? uuidv4();

    try {
      return await this.conversationService.withLock(userId, convId, async () => {
        const context = await this.conversationService.loadOrCreate(userId, convId);
        const response = await this.handleRequest(context, request);
        await this.conversationService.save(context);
        return response;
      });
    } catch (err: unknown) {
      if (err instanceof ConversationBusyError) {
        this.logger.warn(`Conversation busy: user=${userId} conv=${convId}`);
        return {
          conversationId: convId,
          message: '이전 요청을 처리 중이에요. 잠시 후 다시 시도해 주세요.',
          state: 'ANALYZING',
        };
      }
      throw err;
    }
  }

  /**
   * 실제 라우팅 — withLock 내부에서 호출됨.
   * context는 load 된 상태이고, 모든 sync mutate는 메모리에 즉시 반영됨.
   * chat() 가 마지막에 save 1회 호출.
   */
  private async handleRequest(
    context: import('../dto/chat.dto').ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { message, latitude, longitude } = request;

    // 위치 정보 저장 (첫 메시지에서만)
    if (latitude && longitude && !context.slots.latitude) {
      this.conversationService.updateSlots(context, { latitude, longitude });
    }

    // chatRoomId 저장 (멤버 조회용)
    if (request.chatRoomId && !context.slots.chatRoomId) {
      this.conversationService.updateSlots(context, { chatRoomId: request.chatRoomId });
    }

    // ── Direct Handling (LLM 우회) ──

    // 그룹 예약 핸들러 (우선)
    if (request.sendReminder) return this.groupBooking.handleSendReminder(context, request);
    if (request.finishGroup) return this.groupBooking.handleFinishGroup(context, request);
    if (request.nextTeam) return this.groupBooking.handleNextTeam(context, request);

    // 팀 멤버 선택: 슬롯 이미 선택돼 있으면 슬롯 select로 redirect (단방향 의존성 유지)
    if (request.teamMembers) {
      if (
        request.teamMembers.length > 0 &&
        context.slots.slotId &&
        context.slots.time
      ) {
        this.conversationService.updateSlots(context, {
          groupMode: true,
          currentTeamNumber: context.slots.currentTeamNumber || 1,
          currentTeamMembers: request.teamMembers,
          playerCount: request.teamMembers.length,
        });
        return this.directAction.handleDirectSlotSelect(context, {
          ...request,
          selectedSlotId: context.slots.slotId,
          selectedSlotTime: context.slots.time,
          selectedSlotPrice: context.slots.slotPrice,
        });
      }
      return this.groupBooking.handleTeamMemberSelect(context, request);
    }

    // 결제 결과 핸들러
    if (request.splitPaymentComplete) return this.paymentResult.handleSplitPaymentComplete(context, request);
    if (request.paymentComplete) return this.paymentResult.handlePaymentComplete(context, request);

    // UI 액션 핸들러
    if (request.confirmBooking) return this.directAction.handleDirectBooking(context, request);
    if (request.cancelBooking) return this.directAction.handleCancelBooking(context);
    if (request.selectedSlotId) return this.directAction.handleDirectSlotSelect(context, request);
    if (request.selectedClubId) return this.directAction.handleDirectClubSelect(context, request);

    // ── LLM Processing ──
    this.conversationService.addUserMessage(context, message);

    try {
      context.state = 'ANALYZING';

      const response = await this.llmOrchestrator.processWithLLM(context, request);

      // 카드는 결과/액션 전용 — 진행 안내는 LLM 텍스트로 충분 (UNI-26)
      const actions: ChatAction[] = response.actions ?? [];

      return {
        conversationId: context.conversationId,
        message: response.text || '',
        state: context.state,
        actions: actions.length > 0 ? actions : undefined,
      };
    } catch (error) {
      this.logger.error('Chat processing failed', error);

      const errorMessage = '죄송해요, 잠시 문제가 발생했어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, errorMessage);

      return {
        conversationId: context.conversationId,
        message: errorMessage,
        state: context.state,
        actions: [{ type: 'BOOKING_FAILED', data: { reason: errorMessage } }],
      };
    }
  }

  /**
   * 대화 리셋
   */
  async resetConversation(userId: number, conversationId?: string): Promise<ChatResponseDto> {
    const context = await this.conversationService.reset(userId, conversationId);

    const welcomeMessage =
      '안녕하세요! 파크골프 예약 도우미입니다. 어떤 골프장을 예약하시겠어요?';
    this.conversationService.addAssistantMessage(context, welcomeMessage);
    await this.conversationService.save(context);

    return {
      conversationId: context.conversationId,
      message: welcomeMessage,
      state: context.state,
    };
  }
}

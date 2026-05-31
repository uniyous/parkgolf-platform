import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { UiCardHelper } from './ui-card.helper';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatAction,
  ConversationContext,
} from '../dto/chat.dto';

/**
 * 멤버 선택/리마인더 핸들러 (1예약 = 최대 4명, UNI-36).
 *
 * - handleTeamMemberSelect: 멤버 선택 → 슬롯 조회 (이미 슬롯이 있으면 라우터가 redirect)
 * - handleSendReminder:     더치페이 미결제 참여자 리마인더 push
 */
@Injectable()
export class GroupBookingService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly uiCardHelper: UiCardHelper,
  ) {}

  /**
   * 멤버 선택 → 슬롯 조회 (SHOW_SLOTS).
   * 이미 슬롯이 선택된 케이스는 라우터(BookingAgentService)에서 DirectAction로 redirect 처리.
   */
  async handleTeamMemberSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { teamMembers } = request;
    if (!teamMembers || teamMembers.length === 0) {
      const message = '멤버를 선택해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return { conversationId: context.conversationId, message, state: context.state };
    }

    this.conversationService.updateSlots(context, {
      groupMode: true,
      currentTeamMembers: teamMembers,
      playerCount: teamMembers.length,
    });

    const date = context.slots.date || this.uiCardHelper.getTomorrowDate();
    const clubId = context.slots.clubId;

    if (!clubId) {
      const message = '골프장이 선택되지 않았어요. 골프장을 먼저 선택해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return { conversationId: context.conversationId, message, state: context.state };
    }

    const toolResult = await this.toolExecutor.execute({
      name: 'get_available_slots',
      args: { clubId, date },
    });

    const actions: ChatAction[] = [];
    let message: string;

    if (toolResult.success && (toolResult.result as any)?.availableCount > 0) {
      // UNI-41: 멤버 선택 경유 = group → 슬롯 카드에서 더치 옵션 노출
      actions.push({ type: 'SHOW_SLOTS', data: { ...(toolResult.result as Record<string, unknown>), groupMode: true } });
      message = `${teamMembers.length}명 — 시간을 선택해 주세요!`;
      this.conversationService.setState(context, 'CONFIRMING');
    } else {
      message = `${date}에 예약 가능한 시간이 없어요.`;
    }

    this.conversationService.addAssistantMessage(context, message);
    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  /**
   * 리마인더: 미결제 참여자에게 push 알림 재발송 (더치페이)
   */
  async handleSendReminder(
    context: ConversationContext,
    _request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const chatRoomId = context.slots.chatRoomId;
    const currentTeamMembers = context.slots.currentTeamMembers || [];
    const bookerId = context.slots.bookerId;

    const unpaidMembers = currentTeamMembers.filter((m) => m.userId !== bookerId);

    if (unpaidMembers.length > 0 && chatRoomId) {
      this.toolExecutor.emitSplitPaymentNotification({
        bookerId: bookerId || 0,
        bookerName: '',
        bookingGroupId: 0,
        chatRoomId,
        participants: unpaidMembers.map((m) => ({
          userId: m.userId,
          userName: m.userName,
          amount: 0,
        })),
      });
    }

    const message = '리마인더를 보냈어요! 미결제 참여자들에게 알림이 전송됩니다.';
    this.conversationService.addAssistantMessage(context, message);

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
    };
  }
}

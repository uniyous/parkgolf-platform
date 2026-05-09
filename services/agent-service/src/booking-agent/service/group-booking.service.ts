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
 * 그룹/팀 예약 핸들러 (멀티팀 순차 예약).
 *
 * - handleTeamMemberSelect: 팀 멤버 선택 → 슬롯 조회 (이미 슬롯이 있다면 라우터가 redirect)
 * - handleNextTeam:         "다음 팀" → SELECT_MEMBERS 카드
 * - handleFinishGroup:      "종료" → 그룹 요약 + 시스템 메시지 발송
 * - handleSendReminder:     리마인더 push 전송
 */
@Injectable()
export class GroupBookingService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly uiCardHelper: UiCardHelper,
  ) {}

  /**
   * 팀 멤버 선택 → 슬롯 조회 (SHOW_SLOTS).
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
      currentTeamNumber: context.slots.currentTeamNumber || 1,
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
      actions.push({ type: 'SHOW_SLOTS', data: toolResult.result });
      const teamNumber = context.slots.currentTeamNumber || 1;
      message = `팀${teamNumber} (${teamMembers.length}명) — 시간을 선택해 주세요!`;
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
   * "다음 팀" 버튼 → SELECT_MEMBERS 카드 (이전 팀 표시 + 가용 멤버)
   */
  async handleNextTeam(
    context: ConversationContext,
    _request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const nextTeamNumber = (context.slots.currentTeamNumber || 1) + 1;
    this.conversationService.updateSlots(context, {
      currentTeamNumber: nextTeamNumber,
      currentTeamMembers: undefined,
      groupMode: false,
      slotId: undefined,
      time: undefined,
      slotPrice: undefined,
    });

    const result = await this.uiCardHelper.showSelectMembers(
      context,
      `팀${nextTeamNumber} 멤버를 선택해 주세요!`,
    );
    if (result) return result;

    const message = '채팅방 멤버를 조회할 수 없어요.';
    this.conversationService.addAssistantMessage(context, message);
    return { conversationId: context.conversationId, message, state: context.state };
  }

  /**
   * "종료" 버튼 → 그룹 예약 요약 + 채팅방 SYSTEM 메시지
   */
  async handleFinishGroup(
    context: ConversationContext,
    _request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const completedTeams = context.slots.completedTeams || [];

    const totalPrice = completedTeams.reduce((sum, t) => sum + t.totalPrice, 0);
    const totalMembers = completedTeams.reduce((sum, t) => sum + t.members.length, 0);

    const summaryData = {
      success: true,
      groupSummary: true,
      teamCount: completedTeams.length,
      totalMembers,
      totalPrice,
      teams: completedTeams.map((t) => ({
        teamNumber: t.teamNumber,
        bookingNumber: t.bookingNumber,
        slotTime: t.slotTime,
        gameName: t.gameName,
        members: t.members.map((m) => m.userName),
        totalPrice: t.totalPrice,
        paymentMethod: t.paymentMethod,
      })),
    };

    const message = `${completedTeams.length}개 팀 예약이 모두 완료되었어요!`;
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'COMPLETED');

    if (context.slots.chatRoomId) {
      const systemMsg = `[그룹 예약 완료] ${completedTeams.length}팀, 총 ${totalMembers}명 — ${context.slots.clubName} (${context.slots.date})`;
      this.toolExecutor.sendSystemMessage(context.slots.chatRoomId, systemMsg);
    }

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'TEAM_COMPLETE', data: summaryData }],
    };
  }

  /**
   * 리마인더: 미결제 참여자에게 push 알림 재발송
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

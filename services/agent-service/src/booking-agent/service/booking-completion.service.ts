import { Injectable, Logger } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { UserMemoryService } from './user-memory.service';
import { ChatRequestDto, ChatResponseDto, ConversationContext } from '../dto/chat.dto';

/**
 * 팀 완료 처리 (TEAM_COMPLETE 카드 + completedTeams 누적).
 * DirectAction / GroupBooking / PaymentResult 핸들러가 모두 호출하는 공통 헬퍼.
 */
@Injectable()
export class BookingCompletionService {
  private readonly logger = new Logger(BookingCompletionService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly userMemory: UserMemoryService,
  ) {}

  /**
   * 팀 예약 완료 처리:
   * 1. completedTeams에 누적
   * 2. TEAM_COMPLETE 카드 데이터 생성
   * 3. chatRoomId가 있으면 채팅방 전체에 브로드캐스트 (API 응답에서는 actions 제외)
   * 4. 없으면 API 응답으로 직접 전달
   */
  completeTeam(
    context: ConversationContext,
    _request: ChatRequestDto,
    result: any,
  ): ChatResponseDto {
    const teamNumber = context.slots.currentTeamNumber || 1;
    const teamMembers = context.slots.currentTeamMembers || [];
    const paymentMethod = context.slots.paymentMethod || 'onsite';

    const completedTeam = {
      teamNumber,
      bookingId: result.bookingId || context.slots.bookingId || 0,
      bookingNumber: result.bookingNumber || context.slots.bookingNumber || '',
      slotId: context.slots.slotId || '',
      slotTime: context.slots.time || '',
      gameName: context.slots.gameName || '',
      members: teamMembers.map((m) => ({ userId: m.userId, userName: m.userName })),
      totalPrice: result.details?.totalPrice || context.slots.totalPrice || 0,
      paymentMethod,
    };

    const completedTeams = [...(context.slots.completedTeams || []), completedTeam];
    this.conversationService.updateSlots(context, { completedTeams });

    // 채팅방 전체 멤버 수를 알 수 없으므로 hasMoreTeams는 항상 true (UI 측에서 판단)
    const hasMoreTeams = true;

    const teamCompleteData = {
      teamNumber,
      bookingId: completedTeam.bookingId,
      bookingNumber: completedTeam.bookingNumber,
      clubName: context.slots.clubName || '',
      date: context.slots.date || '',
      slotTime: context.slots.time || '',
      gameName: completedTeam.gameName,
      participants: completedTeam.members,
      totalPrice: completedTeam.totalPrice,
      paymentMethod,
      hasMoreTeams,
    };

    const message = `팀${teamNumber} 예약이 완료되었어요!`;
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'TEAM_COMPLETE');

    // [Phase 3 — Semantic Memory] 사용자 메모리에 부킹 결과 누적 (fire-and-forget, 응답 지연 방지)
    // 실패해도 부킹 흐름엔 영향 없음. UserMemoryService 내부에서 try/catch.
    const userId = context.userId;
    const clubIdRaw = context.slots.clubId;
    const clubIdNum = clubIdRaw ? Number(clubIdRaw) : NaN;
    if (userId && !Number.isNaN(clubIdNum)) {
      void this.userMemory.mergeBookingResult({
        userId,
        bookingId: completedTeam.bookingId,
        clubId: clubIdNum,
        clubName: context.slots.clubName || '',
        date: context.slots.date || '',
        startTime: context.slots.time || '',
        playerCount: teamMembers.length,
        paymentMethod,
        teamMembers: teamMembers.map((m) => ({ userId: m.userId, userName: m.userName })),
      });
    }

    // 채팅방 전체 브로드캐스트 (senderId=0). API 응답에는 actions 제외 (중복 방지).
    const roomId = context.slots.chatRoomId;
    if (roomId) {
      this.toolExecutor.broadcastTeamCompleteCard(roomId, teamCompleteData);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // chatRoomId 없으면 직접 응답에 포함
    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'TEAM_COMPLETE', data: teamCompleteData }],
    };
  }
}

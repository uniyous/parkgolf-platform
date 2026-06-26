import { Injectable, Logger } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { UserMemoryService } from './user-memory.service';
import { ChatResponseDto, ConversationContext } from '../dto/chat.dto';

/**
 * 예약 확정(완료) 처리 — 1예약(최대 4명) 모델 (UNI-36).
 *
 * 결제수단별 완료 진입점(onsite/card/dutchpay)이 공통 finalizeBooking 을 호출한다.
 * L3(Semantic Memory) 누적은 finalizeBooking **단 1곳**에서만 → 누락/중복 0.
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
   * 예약 최종 확정 공통 처리:
   * 1. TEAM_COMPLETE 카드 데이터 생성
   * 2. COMPLETED 상태 전이
   * 3. L3(Semantic Memory) 누적 — 여기 단 1곳 (fire-and-forget)
   * 4. chatRoomId 있으면 채팅방 브로드캐스트(응답엔 actions 제외), 없으면 응답에 포함
   *
   * onsite/card/dutchpay 완료 경로가 모두 이 메서드로 수렴한다.
   */
  finalizeBooking(
    context: ConversationContext,
    result: any,
    recordMemory = true,
  ): ChatResponseDto {
    const members = context.slots.currentTeamMembers || [];
    const paymentMethod = context.slots.paymentMethod || 'onsite';
    const bookingId = result.bookingId || context.slots.bookingId || 0;
    const bookingNumber = result.bookingNumber || context.slots.bookingNumber || '';
    const totalPrice = result.details?.totalPrice || context.slots.totalPrice || 0;
    // 1인 예약은 members 가 비어있을 수 있음 → playerCount 폴백
    const playerCount = members.length || context.slots.playerCount || 1;

    const teamCompleteData = {
      bookingId,
      bookingNumber,
      clubName: context.slots.clubName || '',
      date: context.slots.date || '',
      slotTime: context.slots.time || '',
      gameName: context.slots.gameName || '',
      participants: members.map((m) => ({ userId: m.userId, userName: m.userName })),
      totalPrice,
      paymentMethod,
    };

    const message = '예약이 완료되었어요!';
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.updateSlots(context, { confirmed: true });
    this.conversationService.setState(context, 'COMPLETED');

    // [L3 — Semantic Memory] 부킹 결과 누적 (fire-and-forget, 응답 지연 방지).
    // onsite/card 는 확정 시점에 여기서 1회 기록.
    // dutchpay 는 "누가 마지막에 결제하는지" 비결정적이라 생성 시점(부커 컨텍스트)에서
    // recordBookingMemory 로 이미 1회 기록 → 여기선 recordMemory=false 로 중복 방지.
    if (recordMemory) {
      this.recordSemanticMemory(context, paymentMethod, playerCount);
    }

    // 채팅방 브로드캐스트 (senderId=0). API 응답에는 actions 제외 (중복 방지).
    // 예약 참여자(+booker)를 targetUserIds로 명시 → settlement 카드와 동일하게 멤버별 전송.
    // 멤버 미지정(1인 등)이면 targetUserIds 없이 방 전체 브로드캐스트.
    const roomId = context.slots.chatRoomId;
    if (roomId) {
      const memberIds = members.map((m) => m.userId);
      const targetUserIds = memberIds.length > 0
        ? Array.from(new Set([...memberIds, context.userId]))
        : undefined;
      this.toolExecutor.broadcastTeamCompleteCard(
        roomId,
        teamCompleteData,
        targetUserIds,
        context.userId,
      );
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // chatRoomId 없으면(1:1 비채팅방) 직접 응답에 포함
    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'TEAM_COMPLETE', data: teamCompleteData }],
    };
  }

  /**
   * 더치페이 전용 — 예약 생성(부커 컨텍스트) 시점에 L3 1회 기록.
   * 결제 완료는 참여자별로 분산·비결정적이라, 부커가 반드시 1회 거치는 생성 시점이 결정적.
   */
  recordBookingMemory(context: ConversationContext): void {
    const paymentMethod = context.slots.paymentMethod || 'onsite';
    const playerCount = (context.slots.currentTeamMembers || []).length
      || context.slots.playerCount || 1;
    this.recordSemanticMemory(context, paymentMethod, playerCount);
  }

  /** L3 누적 — clubId 유효 시에만. teamMembers 없으면 본인 1인으로 기록. */
  private recordSemanticMemory(
    context: ConversationContext,
    paymentMethod: string,
    playerCount: number,
  ): void {
    const userId = context.userId;
    const clubIdNum = context.slots.clubId ? Number(context.slots.clubId) : NaN;
    if (!userId || Number.isNaN(clubIdNum)) return;

    const members = context.slots.currentTeamMembers || [];
    void this.userMemory.mergeBookingResult({
      userId,
      bookingId: context.slots.bookingId || 0,
      clubId: clubIdNum,
      clubName: context.slots.clubName || '',
      date: context.slots.date || '',
      startTime: context.slots.time || '',
      playerCount,
      paymentMethod,
      teamMembers: members.map((m) => ({ userId: m.userId, userName: m.userName })),
    });
  }
}

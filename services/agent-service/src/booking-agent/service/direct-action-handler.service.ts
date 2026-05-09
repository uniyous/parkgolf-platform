import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { UiCardHelper } from './ui-card.helper';
import { BookingCompletionService } from './booking-completion.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatAction,
  ConversationContext,
} from '../dto/chat.dto';

/**
 * UI 액션 클릭에 대한 직접 처리 (LLM 우회).
 * - handleDirectClubSelect:  골프장 선택 → SELECT_MEMBERS
 * - handleDirectSlotSelect:  슬롯 선택 → CONFIRM_BOOKING
 * - handleDirectBooking:     예약 확정 → 결제방법 분기 (현장/카드/더치페이)
 * - handleCancelBooking:     취소 클릭 → 슬롯 초기화
 */
@Injectable()
export class DirectActionHandlerService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly uiCardHelper: UiCardHelper,
    private readonly bookingCompletion: BookingCompletionService,
  ) {}

  /**
   * 골프장 카드 클릭 → 채팅방 멤버 조회 → SELECT_MEMBERS 카드
   */
  async handleDirectClubSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { selectedClubId, selectedClubName } = request;

    this.conversationService.updateSlots(context, {
      clubId: selectedClubId,
      clubName: selectedClubName,
    });

    const result = await this.uiCardHelper.showSelectMembers(
      context,
      `${selectedClubName}이(가) 선택되었어요! 함께 플레이할 멤버를 선택해 주세요.`,
    );
    if (result) return result;

    // 폴백: chatRoomId 없거나 멤버 조회 실패 → 슬롯 바로 표시
    const date = context.slots.date || this.uiCardHelper.getTomorrowDate();
    const toolResult = await this.toolExecutor.execute({
      name: 'get_available_slots',
      args: { clubId: selectedClubId, date },
    });

    const actions: ChatAction[] = [];
    let message: string;

    if (toolResult.success && (toolResult.result as any)?.availableCount > 0) {
      actions.push({ type: 'SHOW_SLOTS', data: toolResult.result });
      message = `${selectedClubName}의 예약 가능 시간이에요!`;
      this.conversationService.setState(context, 'CONFIRMING');
    } else {
      message = `${selectedClubName}에 ${date} 예약 가능한 시간이 없어요. 다른 날짜나 골프장을 선택해 주세요.`;
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
   * 슬롯 카드 클릭 → 멤버 미선택 시 SELECT_MEMBERS, 선택 완료 시 CONFIRM_BOOKING
   */
  async handleDirectSlotSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { selectedSlotId, selectedSlotTime, selectedSlotPrice } = request;

    if (!context.slots.clubId && request.selectedClubId) {
      this.conversationService.updateSlots(context, {
        clubId: request.selectedClubId,
        clubName: request.selectedClubName,
      });
    }

    this.conversationService.updateSlots(context, {
      slotId: selectedSlotId,
      time: selectedSlotTime,
      slotPrice: selectedSlotPrice,
      ...(request.selectedGameName && { gameName: request.selectedGameName }),
    });

    if (!context.slots.groupMode) {
      const result = await this.uiCardHelper.showSelectMembers(
        context,
        '멤버를 선택해 주세요!',
      );
      if (result) return result;
      // 폴백: 멤버 조회 실패 시 1인 예약으로 진행
    }

    const playerCount = context.slots.currentTeamMembers?.length || context.slots.playerCount || 4;
    const slotPrice = selectedSlotPrice || context.slots.slotPrice || 0;
    const price = slotPrice * playerCount;

    const confirmData: Record<string, unknown> = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.uiCardHelper.getTomorrowDate(),
      time: selectedSlotTime || context.slots.time || '',
      playerCount,
      price,
      groupMode: true,
      teamNumber: context.slots.currentTeamNumber || 1,
      members: (context.slots.currentTeamMembers || []).map((m) => ({
        userId: m.userId,
        userName: m.userName,
      })),
      pricePerPerson: slotPrice,
    };

    const message = '예약 정보를 확인해 주세요!';
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'CONFIRMING');

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'CONFIRM_BOOKING', data: confirmData }],
    };
  }

  /**
   * 예약 확인 버튼 클릭 → 예약 생성.
   * 결제방법(onsite/card/dutchpay)에 따라 분기.
   */
  async handleDirectBooking(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { clubId, slotId } = context.slots;
    const playerCount = context.slots.groupMode
      ? (context.slots.currentTeamMembers?.length || context.slots.playerCount || 4)
      : (context.slots.playerCount || 4);

    if (!clubId || !slotId) {
      const message = '예약에 필요한 정보가 부족해요. 골프장과 시간을 다시 선택해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    const paymentMethod = request.paymentMethod || 'onsite';
    this.conversationService.updateSlots(context, { paymentMethod });
    this.conversationService.setState(context, 'BOOKING');

    const toolResult = await this.toolExecutor.execute({
      name: 'create_booking',
      args: {
        userId: request.userId,
        userName: request.userName,
        userEmail: request.userEmail,
        gameTimeSlotId: Number(slotId),
        playerCount,
        paymentMethod,
      },
    });

    const actions: ChatAction[] = [];
    let message: string;
    const result = toolResult.result as any;

    if (toolResult.success && result?.success) {
      const status = result.status; // CONFIRMED | SLOT_RESERVED | PENDING

      if (paymentMethod === 'dutchpay' && (status === 'SLOT_RESERVED' || status === 'CONFIRMED')) {
        return this.handleDutchpayBranch(context, request, result, playerCount);
      }

      if (status === 'CONFIRMED') {
        if (context.slots.groupMode) {
          return this.bookingCompletion.completeTeam(context, request, result);
        }
        actions.push({ type: 'TEAM_COMPLETE', data: result });
        message = '예약이 완료되었습니다!';
        this.conversationService.updateSlots(context, { confirmed: true });
        this.conversationService.setState(context, 'COMPLETED');
      } else if (status === 'SLOT_RESERVED') {
        return this.handleCardPaymentBranch(context, request, result, playerCount);
      } else {
        // PENDING — 폴링 타임아웃 (graceful degradation)
        actions.push({ type: 'TEAM_COMPLETE', data: result });
        message = '예약이 처리 중이에요. 잠시 후 예약 내역에서 확인해 주세요.';
        this.conversationService.updateSlots(context, { confirmed: true });
        this.conversationService.setState(context, 'COMPLETED');
      }
    } else {
      const errorMsg = result?.message || toolResult.error || '예약에 실패했습니다';
      message = `예약에 실패했어요: ${errorMsg}`;
      actions.push({ type: 'BOOKING_FAILED', data: { reason: errorMsg } });
      this.conversationService.setState(context, 'COLLECTING');
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
   * 더치페이 분기: 분할결제 준비 + 참여자 push 알림 + 정산 카드 브로드캐스트
   */
  private async handleDutchpayBranch(
    context: ConversationContext,
    request: ChatRequestDto,
    result: any,
    _playerCount: number,
  ): Promise<ChatResponseDto> {
    this.conversationService.updateSlots(context, {
      bookingId: result.bookingId,
      bookingNumber: result.bookingNumber,
      totalPrice: result.details?.totalPrice,
      bookerId: request.userId,
    });

    const teamMembers = context.slots.currentTeamMembers || [];
    const pricePerPerson = (result.details?.totalPrice || 0) / (teamMembers.length || 1);

    const splitResult = await this.toolExecutor.prepareSplitPayment({
      bookingId: result.bookingId,
      participants: teamMembers.map((m) => ({
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
        amount: Math.round(pricePerPerson),
      })),
    });

    const splits = splitResult?.splits || teamMembers.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      orderId: '',
      amount: Math.round(pricePerPerson),
      status: 'PENDING',
      expiredAt: '',
    }));

    const teamNumber = context.slots.currentTeamNumber || 1;

    const settlementData = {
      bookingId: result.bookingId,
      bookerId: request.userId,
      teamNumber,
      clubName: context.slots.clubName || '',
      gameName: context.slots.gameName || '',
      date: context.slots.date || '',
      slotTime: context.slots.time || '',
      totalParticipants: teamMembers.length,
      pricePerPerson: Math.round(pricePerPerson),
      totalPrice: result.details?.totalPrice || 0,
      paidCount: 0,
      expiredAt: splits[0]?.expiredAt || '',
      participants: splits.map((s: any) => ({
        userId: s.userId,
        userName: s.userName || '',
        orderId: s.orderId || '',
        amount: s.amount || Math.round(pricePerPerson),
        status: s.status || 'PENDING',
        expiredAt: s.expiredAt || '',
      })),
    };

    // 진행자 제외 참여자에게 push 알림
    const otherParticipants = splits.filter((s: any) => s.userId !== request.userId);
    if (otherParticipants.length > 0) {
      this.toolExecutor.emitSplitPaymentNotification({
        bookerId: request.userId,
        bookerName: request.userName || '',
        bookingGroupId: 0,
        chatRoomId: context.slots.chatRoomId || '',
        participants: otherParticipants.map((s: any) => ({
          userId: s.userId,
          userName: s.userName || '',
          amount: s.amount || Math.round(pricePerPerson),
        })),
      });
    }

    // 예약자 제외 참여자에게만 정산 카드 브로드캐스트
    const nonBookerSplits = splits.filter((s: any) => s.userId !== request.userId);
    if (context.slots.chatRoomId && nonBookerSplits.length > 0) {
      this.toolExecutor.broadcastSettlementCard(
        context.slots.chatRoomId,
        nonBookerSplits.map((s: any) => s.userId),
        settlementData,
        undefined,
        request.userId,
      );
    }

    const message = `팀${teamNumber} 예약이 생성되었어요! 참여자들에게 결제 요청이 전송됩니다.`;
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'SETTLING');

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
    };
  }

  /**
   * 카드결제 분기: payment.prepare 호출 + SHOW_PAYMENT 카드 반환
   */
  private async handleCardPaymentBranch(
    context: ConversationContext,
    request: ChatRequestDto,
    result: any,
    playerCount: number,
  ): Promise<ChatResponseDto> {
    this.conversationService.updateSlots(context, {
      bookingId: result.bookingId,
      bookingNumber: result.bookingNumber,
      totalPrice: result.details?.totalPrice,
    });

    const amount = result.details?.totalPrice || 0;
    const orderName = `ParkGolf #${result.bookingNumber || result.bookingId}`;

    const prepareResult = await this.toolExecutor.preparePayment({
      bookingId: result.bookingId,
      amount,
      orderName,
      userId: request.userId,
    });

    const message = '결제를 진행해 주세요!';
    this.conversationService.addAssistantMessage(context, message);
    // state stays BOOKING

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{
        type: 'SHOW_PAYMENT',
        data: {
          bookingId: result.bookingId,
          orderId: prepareResult?.orderId || null,
          amount,
          orderName,
          clubName: context.slots.clubName || '',
          date: result.details?.date || context.slots.date || '',
          time: result.details?.time || context.slots.time || '',
          playerCount: result.details?.playerCount || playerCount || 4,
        },
      }],
    };
  }

  /**
   * 취소 버튼 클릭 → 슬롯 선택 초기화
   */
  handleCancelBooking(context: ConversationContext): ChatResponseDto {
    this.conversationService.updateSlots(context, {
      slotId: undefined,
      time: undefined,
    });
    this.conversationService.setState(context, 'COLLECTING');

    const message = '취소했어요. 다른 시간을 선택해 주세요.';
    this.conversationService.addAssistantMessage(context, message);

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
    };
  }
}

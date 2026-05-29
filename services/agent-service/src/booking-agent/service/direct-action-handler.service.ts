import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { EffectExecutorService } from './effect-executor.service';
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
    private readonly effectExecutor: EffectExecutorService,
    private readonly uiCardHelper: UiCardHelper,
    private readonly bookingCompletion: BookingCompletionService,
  ) {}

  /**
   * 골프장 카드 클릭
   * - 채팅방 그룹 진입 + 멤버 미선택 → SELECT_MEMBERS 먼저 (인원수 확정)
   * - 그 외(채팅방 외 / 이미 멤버 선택) → SHOW_SLOTS 직행
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

    // 채팅방 + 아직 멤버 미선택 → SELECT_MEMBERS 우선 (UNI-21)
    const isChatRoom = !!context.slots.chatRoomId;
    const hasMembers = (context.slots.currentTeamMembers || []).length > 0;
    if (isChatRoom && !hasMembers) {
      const result = await this.uiCardHelper.showSelectMembers(
        context,
        `${selectedClubName} — 함께할 멤버를 선택해 주세요!`,
      );
      if (result) return result;
      // 폴백: 멤버 조회 실패 시 기존 슬롯 흐름
    }

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
   * 슬롯 카드 클릭 → 바로 CONFIRM_BOOKING.
   * 멤버는 클럽 선택 시점에 이미 확정 (UNI-21 흐름 변경).
   * 채팅방 외 1인 진입은 groupMode=false / playerCount=1 default.
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

    // 인원수(멤버) 확정 전에는 타임슬롯 확정 불가 — 채팅방이면 멤버 선택을 먼저 띄운다.
    // (허용 순서: 골프장→멤버 / 멤버→골프장. 금지: 골프장+슬롯 선택 후 멤버. UNI-21)
    const isChatRoom = !!context.slots.chatRoomId;
    const hasMembers = (context.slots.currentTeamMembers || []).length > 0;
    if (isChatRoom && !hasMembers) {
      const selectMembers = await this.uiCardHelper.showSelectMembers(
        context,
        '먼저 함께할 멤버를 선택해 주세요! (인원수 확정 후 시간 선택)',
      );
      if (selectMembers) return selectMembers;
      // 폴백: 멤버 조회 실패 시에만 기존 슬롯 확정 흐름 진행
    }

    this.conversationService.updateSlots(context, {
      slotId: selectedSlotId,
      time: selectedSlotTime,
      slotPrice: selectedSlotPrice,
      ...(request.selectedGameName && { gameName: request.selectedGameName }),
    });

    const teamMembers = context.slots.currentTeamMembers || [];
    const isGroup = context.slots.groupMode || teamMembers.length > 0;
    const playerCount = isGroup
      ? teamMembers.length || context.slots.playerCount || 1
      : context.slots.playerCount || 1;
    const slotPrice = selectedSlotPrice || context.slots.slotPrice || 0;
    const price = slotPrice * playerCount;

    const confirmData: Record<string, unknown> = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.uiCardHelper.getTomorrowDate(),
      time: selectedSlotTime || context.slots.time || '',
      playerCount,
      price,
      groupMode: isGroup,
      members: teamMembers.map((m) => ({
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

    // 더치페이: 채팅방 팀 멤버 + 채팅방 id를 saga payload에 전달 → saga의 PREPARE_SPLIT step
    const isDutchpay = paymentMethod === 'dutchpay';
    const teamMembers = isDutchpay
      ? (context.slots.currentTeamMembers || []).map((m) => ({
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail,
        }))
      : undefined;

    // saga 시작은 effect-executor 단일 게이트 경유 — journal 기록 + 재진입 멱등 (UNI-34)
    const toolResult = await this.effectExecutor.commitBooking({
      conversationId: context.conversationId,
      userId: request.userId,
      userName: request.userName,
      userEmail: request.userEmail,
      slotId: Number(slotId),
      playerCount,
      paymentMethod,
      teamMembers,
      chatRoomId: isDutchpay ? context.slots.chatRoomId : undefined,
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
        // 현장결제: 즉시 확정 → 공통 finalize (onsite, 1예약/≤4명)
        return this.bookingCompletion.finalizeBooking(context, result);
      } else if (status === 'SLOT_RESERVED') {
        return this.handleCardPaymentBranch(context, request, result, playerCount);
      } else {
        // PENDING — 폴링 타임아웃. saga는 진행 중일 수 있어 확정 처리(finalize)는 보류.
        // L3는 확정 시점에만 기록하므로 여기선 기록하지 않음(과대집계 방지).
        message = '예약이 처리 중이에요. 잠시 후 예약 내역에서 확인해 주세요.';
        actions.push({ type: 'TEAM_COMPLETE', data: result });
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

    // splits는 saga의 PREPARE_SPLIT step이 발급 — createBooking 응답에 포함되어 있다.
    // saga 단계에서 누락된 경우(예: condition 미충족, payment 일시 장애)에 한해 placeholder 생성.
    const splits = (result.splits as any[]) || teamMembers.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      orderId: '',
      amount: Math.round(pricePerPerson),
      status: 'PENDING',
      expiredAt: '',
    }));

    const settlementData = {
      bookingId: result.bookingId,
      bookerId: request.userId,
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

    // [L3] 더치페이는 결제 완료가 참여자별로 분산·비결정적이라, 부커가 반드시 1회 거치는
    // 이 생성 시점에서 L3를 기록한다 (정산완료 finalize 는 recordMemory=false 로 중복 방지).
    this.bookingCompletion.recordBookingMemory(context);

    const message = '예약이 생성되었어요! 참여자들에게 결제 요청이 전송됩니다.';
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

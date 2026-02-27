import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekService, DeepSeekResponse, ToolCall } from './deepseek.service';
import { ToolExecutorService, ToolResult } from './tool-executor.service';
import { ConversationService } from './conversation.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatAction,
  ConversationContext,
} from '../dto/chat.dto';

/**
 * 예약 에이전트 서비스
 * DeepSeek + 도구 실행 + 대화 관리 통합
 */
@Injectable()
export class BookingAgentService {
  private readonly logger = new Logger(BookingAgentService.name);
  private readonly MAX_TOOL_ITERATIONS = 5;

  constructor(
    private readonly deepseekService: DeepSeekService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * 채팅 처리
   */
  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    const { userId, message, conversationId, latitude, longitude } = request;

    // 대화 컨텍스트 조회/생성
    const context = this.conversationService.getOrCreate(userId, conversationId);

    // 위치 정보 저장 (첫 메시지에서만)
    if (latitude && longitude && !context.slots.latitude) {
      this.conversationService.updateSlots(context, { latitude, longitude });
    }

    // chatRoomId 저장 (그룹 예약용)
    if (request.chatRoomId && !context.slots.chatRoomId) {
      this.conversationService.updateSlots(context, { chatRoomId: request.chatRoomId });
    }

    // ── Direct Handling (LLM 없음) ──
    if (request.splitPaymentComplete) return this.handleSplitPaymentComplete(context, request);
    if (request.paymentComplete) return this.handlePaymentComplete(context, request);
    if (request.confirmGroupBooking) return this.handleGroupBookingConfirm(context, request);
    if (request.confirmBooking) return this.handleDirectBooking(context, request);
    if (request.cancelBooking) return this.handleCancelBooking(context);
    if (request.selectedSlots && request.selectedSlots.length > 1) return this.handleMultiSlotSelect(context, request);
    if (request.selectedSlotId) return this.handleDirectSlotSelect(context, request);
    if (request.selectedClubId) return this.handleDirectClubSelect(context, request);
    if (request.teams) return this.handleTeamConfirm(context, request);

    // ── LLM Processing (기존 방식) ──
    // 사용자 메시지 추가
    this.conversationService.addUserMessage(context, message);

    try {
      // DeepSeek 대화 처리 (도구 호출 포함)
      const response = await this.processWithLLM(context, request);

      return {
        conversationId: context.conversationId,
        message: response.text || '',
        state: context.state,
        actions: response.actions,
      };
    } catch (error) {
      this.logger.error('Chat processing failed', error);

      // 에러 응답
      const errorMessage = '죄송해요, 잠시 문제가 발생했어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, errorMessage);

      return {
        conversationId: context.conversationId,
        message: errorMessage,
        state: context.state,
      };
    }
  }

  /**
   * 대화 리셋
   */
  resetConversation(userId: number): ChatResponseDto {
    const context = this.conversationService.create(userId);

    const welcomeMessage =
      '안녕하세요! 파크골프장 예약을 도와드릴게요. 🏌️\n' +
      '어느 지역에서 골프를 치고 싶으세요?';

    this.conversationService.addAssistantMessage(context, welcomeMessage);

    return {
      conversationId: context.conversationId,
      message: welcomeMessage,
      state: 'IDLE',
    };
  }

  // ── Direct Handlers (LLM 없이 직접 처리) ──

  /**
   * 골프장 카드 클릭 → 해당 골프장의 슬롯 조회
   */
  private async handleDirectClubSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { selectedClubId, selectedClubName } = request;
    const date = context.slots.date || this.getTomorrowDate();

    this.conversationService.updateSlots(context, {
      clubId: selectedClubId,
      clubName: selectedClubName,
    });

    // get_available_slots 직접 호출
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
   * 슬롯 카드 클릭 → 예약 확인 카드 표시
   */
  private handleDirectSlotSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): ChatResponseDto {
    const { selectedSlotId, selectedSlotTime, selectedSlotPrice } = request;

    // 검색 결과에서 바로 슬롯 선택한 경우 — clubId도 설정
    if (!context.slots.clubId && request.selectedClubId) {
      this.conversationService.updateSlots(context, {
        clubId: request.selectedClubId,
        clubName: request.selectedClubName,
      });
    }

    this.conversationService.updateSlots(context, {
      slotId: selectedSlotId,
      time: selectedSlotTime,
    });

    const playerCount = context.slots.playerCount || 4;
    const price = (selectedSlotPrice || 0) * playerCount;

    const confirmData = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      time: selectedSlotTime || '',
      playerCount,
      price,
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
   * 예약 확인 버튼 클릭 → 예약 생성
   * 결제방법에 따라 CONFIRMED(현장결제) 또는 SLOT_RESERVED(카드결제) 분기
   */
  private async handleDirectBooking(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { clubId, slotId, playerCount } = context.slots;

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
    this.conversationService.setState(context, 'BOOKING');

    const toolResult = await this.toolExecutor.execute({
      name: 'create_booking',
      args: {
        userId: request.userId,
        userName: request.userName,
        userEmail: request.userEmail,
        gameTimeSlotId: Number(slotId),
        playerCount: playerCount || 4,
        paymentMethod,
      },
    });

    const actions: ChatAction[] = [];
    let message: string;
    const result = toolResult.result as any;

    if (toolResult.success && result?.success) {
      const status = result.status; // CONFIRMED | SLOT_RESERVED | PENDING

      if (status === 'CONFIRMED') {
        // 현장결제 — Saga 완료, 바로 예약 확정
        actions.push({ type: 'BOOKING_COMPLETE', data: result });
        message = '예약이 완료되었습니다!';
        this.conversationService.updateSlots(context, { confirmed: true });
        this.conversationService.setState(context, 'COMPLETED');
      } else if (status === 'SLOT_RESERVED') {
        // 카드결제 — 슬롯 확보 완료, payment.prepare 원샷 처리
        this.conversationService.updateSlots(context, { bookingId: result.bookingId });

        const amount = result.details?.totalPrice || 0;
        const orderName = `ParkGolf #${result.bookingNumber || result.bookingId}`;

        // payment.prepare 호출 → orderId 발급
        const prepareResult = await this.toolExecutor.preparePayment({
          bookingId: result.bookingId,
          amount,
          orderName,
          userId: request.userId,
        });

        actions.push({
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
        });
        message = '결제를 진행해 주세요!';
        // state stays BOOKING
      } else {
        // PENDING — 폴링 타임아웃 (graceful degradation)
        actions.push({ type: 'BOOKING_COMPLETE', data: result });
        message = '예약이 처리 중이에요. 잠시 후 예약 내역에서 확인해 주세요.';
        this.conversationService.updateSlots(context, { confirmed: true });
        this.conversationService.setState(context, 'COMPLETED');
      }
    } else {
      const errorMsg = result?.message || toolResult.error || '예약에 실패했습니다';
      message = `예약에 실패했어요: ${errorMsg}. 다른 시간을 선택해 주세요.`;
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
   * 결제 완료/실패 후 결과 처리
   */
  private handlePaymentComplete(
    context: ConversationContext,
    request: ChatRequestDto,
  ): ChatResponseDto {
    const actions: ChatAction[] = [];
    let message: string;

    if (request.paymentSuccess) {
      // 결제 성공 — BOOKING_COMPLETE 카드 표시
      actions.push({
        type: 'BOOKING_COMPLETE',
        data: {
          success: true,
          bookingId: context.slots.bookingId,
          details: {
            date: context.slots.date,
            time: context.slots.time,
            playerCount: context.slots.playerCount,
          },
        },
      });
      message = '결제가 완료되었습니다! 예약이 확정되었어요!';
      this.conversationService.updateSlots(context, { confirmed: true });
      this.conversationService.setState(context, 'COMPLETED');
    } else {
      // 결제 실패/취소 — 재시도 안내
      message = '결제가 취소되었어요. 다시 시도하거나 다른 결제방법을 선택해 주세요.';
      this.conversationService.setState(context, 'CONFIRMING');
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
   * 분할결제 완료 → 갱신된 정산 카드 반환
   */
  private async handleSplitPaymentComplete(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { bookingGroupId, bookerId } = context.slots;

    if (!bookingGroupId) {
      const message = '정산 정보를 찾을 수 없어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // 최신 분할결제 상태 조회
    const splitStatus = await this.toolExecutor.getSplitStatus(bookingGroupId);

    if (!splitStatus) {
      const message = '정산 상태를 조회할 수 없어요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    const participants = splitStatus.splits || [];
    const totalParticipants = participants.length;
    const paidCount = participants.filter((s: any) => s.status === 'PAID').length;
    const pricePerPerson = participants[0]?.amount || 0;
    const allPaid = paidCount === totalParticipants;

    const actions: ChatAction[] = [{
      type: 'SETTLEMENT_STATUS',
      data: {
        groupNumber: splitStatus.groupNumber || '',
        bookingGroupId,
        bookerId: bookerId || 0,
        totalParticipants,
        pricePerPerson,
        totalPrice: totalParticipants * pricePerPerson,
        paidCount,
        participants: participants.map((s: any) => ({
          userId: s.userId,
          userName: s.userName,
          orderId: s.orderId || '',
          amount: s.amount || pricePerPerson,
          status: s.status,
          expiredAt: s.expiredAt || '',
        })),
      },
    }];

    let message: string;
    if (allPaid) {
      message = '모든 참여자의 결제가 완료되었어요!';
      this.conversationService.setState(context, 'COMPLETED');
    } else {
      message = `결제가 확인되었어요. (${paidCount}/${totalParticipants})`;
    }

    this.conversationService.addAssistantMessage(context, message);

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions,
    };
  }

  /**
   * 복수 슬롯 선택 → 결제방법 선택 카드(CONFIRM_GROUP) 표시
   */
  private handleMultiSlotSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): ChatResponseDto {
    const { selectedSlots } = request;
    if (!selectedSlots || selectedSlots.length < 2) {
      return this.handleDirectSlotSelect(context, request);
    }

    // 선택된 슬롯 저장
    this.conversationService.updateSlots(context, {
      selectedSlots,
      clubId: request.selectedClubId || context.slots.clubId,
      clubName: request.selectedClubName || context.slots.clubName,
    });

    const teamCount = selectedSlots.length;
    const maxPlayers = 4;
    const totalParticipants = teamCount * maxPlayers;
    const pricePerSlot = selectedSlots[0]?.price || 0;

    const confirmData = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      teamCount,
      slots: selectedSlots,
      maxParticipants: totalParticipants,
      pricePerPerson: pricePerSlot,
      totalPrice: totalParticipants * pricePerSlot,
    };

    const message = `${teamCount}개 팀 예약을 준비했어요! 결제 방법을 선택해 주세요.`;
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'CONFIRMING');

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'CONFIRM_GROUP', data: confirmData }],
    };
  }

  /**
   * 팀 편성 확인 → 그룹 예약 생성
   */
  private async handleTeamConfirm(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { teams } = request;
    if (!teams || teams.length === 0) {
      const message = '팀 편성 정보가 없어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // 팀 정보 저장
    this.conversationService.updateSlots(context, { teams });

    // paymentMethod가 dutchpay가 아니면 현장결제 그룹 예약
    const paymentMethod = context.slots.paymentMethod || 'dutchpay';

    if (paymentMethod === 'onsite') {
      // 현장결제 → 바로 그룹 예약 생성
      return this.executeGroupBooking(context, request, 'onsite');
    }

    // 더치페이 → 최종 확인 카드 표시
    const confirmData = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      teams: teams.map((t) => ({
        teamNumber: t.teamNumber,
        slotTime: context.slots.selectedSlots?.find((s) => s.slotId === t.slotId)?.slotTime || '',
        courseName: context.slots.selectedSlots?.find((s) => s.slotId === t.slotId)?.courseName || '',
        memberCount: t.members.length,
        members: t.members.map((m) => m.userName),
      })),
      pricePerPerson: context.slots.selectedSlots?.[0]?.price || 0,
      totalParticipants: teams.reduce((sum, t) => sum + t.members.length, 0),
      paymentMethod,
    };

    const message = '팀 편성이 완료되었어요! 최종 확인 후 예약을 진행해 주세요.';
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'CONFIRMING');

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'CONFIRM_GROUP', data: confirmData }],
    };
  }

  /**
   * 그룹 예약 확인 → 그룹 예약 생성 + 더치페이 준비
   */
  private async handleGroupBookingConfirm(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const paymentMethod = request.paymentMethod || context.slots.paymentMethod || 'dutchpay';

    // 결제방법 저장
    this.conversationService.updateSlots(context, { paymentMethod });

    if (paymentMethod === 'onsite') {
      // 현장결제 → 바로 그룹 예약 생성
      return this.executeGroupBooking(context, request, 'onsite');
    }

    // 더치페이 → 팀 편성 단계로
    if (!context.slots.chatRoomId) {
      const message = '채팅방 정보가 없어요. 채팅방에서 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // 채팅방 멤버 조회
    const members = await this.toolExecutor.getChatRoomMembers(context.slots.chatRoomId);

    if (!members || members.length === 0) {
      const message = '채팅방 멤버를 조회할 수 없어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    const selectedSlots = context.slots.selectedSlots || [];
    const teamCount = selectedSlots.length;
    const maxPlayersPerTeam = 4;
    const playerCount = context.slots.playerCount || members.length;

    // 소규모 그룹 간소화: 1슬롯 + 4명 이하 → 팀편성 생략, 자동 1팀 배정
    if (selectedSlots.length === 1 && playerCount <= 4) {
      const autoTeam = {
        teamNumber: 1,
        slotId: selectedSlots[0].slotId,
        members: members.map((m) => ({
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail,
        })),
      };
      this.conversationService.updateSlots(context, { teams: [autoTeam] });
      return this.executeGroupBooking(context, request, 'dutchpay');
    }

    // 자동 팀 편성
    const autoTeams = this.autoAssignTeams(members, selectedSlots, request.userId, maxPlayersPerTeam);

    const selectData = {
      clubId: context.slots.clubId,
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      pricePerPerson: selectedSlots[0]?.price || 0,
      teams: autoTeams.teams,
      unassigned: autoTeams.unassigned,
      availableSlots: [], // 미사용 슬롯 (현재는 모두 사용)
    };

    const message = `${teamCount}개 팀으로 자동 편성했어요! 드래그로 멤버를 이동할 수 있어요.`;
    this.conversationService.addAssistantMessage(context, message);
    this.conversationService.setState(context, 'SELECTING_PARTICIPANTS');

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'SELECT_PARTICIPANTS', data: selectData }],
    };
  }

  /**
   * 그룹 예약 실행 (Saga)
   */
  private async executeGroupBooking(
    context: ConversationContext,
    request: ChatRequestDto,
    paymentMethod: string,
  ): Promise<ChatResponseDto> {
    const { teams, selectedSlots, clubId, clubName, date, chatRoomId } = context.slots;

    if (!teams || !selectedSlots || !clubId) {
      const message = '예약에 필요한 정보가 부족해요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    this.conversationService.setState(context, 'BOOKING');
    const pricePerPerson = selectedSlots[0]?.price || 0;

    const groupResult = await this.toolExecutor.createBookingGroup({
      chatRoomId: chatRoomId || '',
      bookerId: request.userId,
      bookerName: request.userName || '',
      bookerEmail: request.userEmail || '',
      clubId: Number(clubId),
      clubName: clubName || '',
      date: date || this.getTomorrowDate(),
      teams: teams.map((t) => ({
        gameTimeSlotId: Number(t.slotId),
        participants: t.members.map((m) => ({
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail,
          role: m.userId === request.userId ? 'BOOKER' : 'MEMBER',
        })),
      })),
      pricePerPerson,
      paymentMethod,
    });

    if (!groupResult) {
      const message = '그룹 예약에 실패했어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      this.conversationService.setState(context, 'COLLECTING');
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    this.conversationService.updateSlots(context, {
      bookingGroupId: groupResult.group.id,
    });

    const actions: ChatAction[] = [];
    let message: string;

    if (paymentMethod === 'onsite') {
      // 현장결제 → 예약 완료
      actions.push({ type: 'BOOKING_COMPLETE', data: groupResult });
      message = `${teams.length}개 팀 예약이 완료되었습니다!`;
      this.conversationService.setState(context, 'COMPLETED');
    } else {
      // 더치페이 → 분할결제 준비
      const totalParticipants = teams.reduce((sum, t) => sum + t.members.length, 0);

      // 각 Booking별로 분할결제 준비 + 결과 수집
      const allSplits: Array<{
        userId: number;
        userName: string;
        orderId: string;
        amount: number;
        status: string;
        expiredAt: string;
      }> = [];

      for (const booking of groupResult.bookings) {
        const teamMembers = teams.find((t) => Number(t.slotId) === booking.gameTimeSlotId)?.members || [];
        const splitResult = await this.toolExecutor.prepareSplitPayment({
          bookingGroupId: groupResult.group.id,
          bookingId: booking.id,
          participants: teamMembers.map((m) => ({
            userId: m.userId,
            userName: m.userName,
            userEmail: m.userEmail,
            amount: pricePerPerson,
          })),
        });

        if (splitResult?.splits) {
          allSplits.push(...splitResult.splits.map((s: any) => ({
            userId: s.userId,
            userName: s.userName || teamMembers.find((m) => m.userId === s.userId)?.userName || '',
            orderId: s.orderId,
            amount: s.amount || pricePerPerson,
            status: s.status || 'PENDING',
            expiredAt: s.expiredAt || '',
          })));
        } else {
          // splitPrepare가 splits를 반환하지 않은 경우 폴백
          for (const m of teamMembers) {
            allSplits.push({
              userId: m.userId,
              userName: m.userName,
              orderId: '',
              amount: pricePerPerson,
              status: 'PENDING',
              expiredAt: '',
            });
          }
        }
      }

      // bookerId 저장
      this.conversationService.updateSlots(context, { bookerId: request.userId });

      actions.push({
        type: 'SETTLEMENT_STATUS',
        data: {
          groupNumber: groupResult.group.groupNumber,
          bookingGroupId: groupResult.group.id,
          bookerId: request.userId,
          totalParticipants,
          pricePerPerson,
          totalPrice: totalParticipants * pricePerPerson,
          paidCount: 0,
          participants: allSplits.map((s) => ({
            userId: s.userId,
            userName: s.userName,
            orderId: s.orderId,
            amount: s.amount,
            status: s.status,
            expiredAt: s.expiredAt,
          })),
        },
      });

      // 부커 제외 참여자에게 푸시 알림 발송
      const otherParticipants = allSplits.filter((s) => s.userId !== request.userId);
      if (otherParticipants.length > 0) {
        this.toolExecutor.emitSplitPaymentNotification({
          bookerId: request.userId,
          bookerName: request.userName || '',
          bookingGroupId: groupResult.group.id,
          chatRoomId: chatRoomId || '',
          participants: otherParticipants.map((s) => ({
            userId: s.userId,
            userName: s.userName,
            amount: s.amount,
          })),
        });
      }

      message = `그룹 예약이 생성되었어요! 참여자들에게 개별 결제 요청이 전송됩니다.`;
      this.conversationService.setState(context, 'SETTLING');
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
   * 자동 팀 편성 알고리즘
   * - Booker는 팀 1에 고정
   * - 나머지 멤버를 순서대로 배분
   * - 초과 인원 → unassigned
   */
  private autoAssignTeams(
    members: Array<{ userId: number; userName: string; userEmail: string }>,
    slots: Array<{ slotId: string; slotTime: string; courseName: string; price: number }>,
    bookerId: number,
    maxPlayersPerTeam: number,
  ) {
    const teams: Array<{
      teamNumber: number;
      slotId: string;
      slotTime: string;
      courseName: string;
      maxPlayers: number;
      members: Array<{ userId: number; userName: string; userEmail: string }>;
    }> = slots.map((slot, i) => ({
      teamNumber: i + 1,
      slotId: slot.slotId,
      slotTime: slot.slotTime,
      courseName: slot.courseName,
      maxPlayers: maxPlayersPerTeam,
      members: [],
    }));

    // Booker를 팀 1에 고정
    const booker = members.find((m) => m.userId === bookerId);
    const others = members.filter((m) => m.userId !== bookerId);

    if (booker && teams.length > 0) {
      teams[0].members.push(booker);
    }

    // 나머지 멤버를 순서대로 배분
    const unassigned: Array<{ userId: number; userName: string; userEmail: string }> = [];
    let teamIdx = 0;

    for (const member of others) {
      // 현재 팀이 꽉 찼으면 다음 팀으로
      while (teamIdx < teams.length && teams[teamIdx].members.length >= maxPlayersPerTeam) {
        teamIdx++;
      }

      if (teamIdx < teams.length) {
        teams[teamIdx].members.push(member);
      } else {
        unassigned.push(member);
      }
    }

    return { teams, unassigned };
  }

  /**
   * 취소 버튼 클릭 → 슬롯 선택 초기화
   */
  private handleCancelBooking(context: ConversationContext): ChatResponseDto {
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

  /**
   * 내일 날짜 반환 (YYYY-MM-DD)
   */
  private getTomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  /**
   * DeepSeek 대화 처리 (도구 호출 루프)
   */
  private async processWithLLM(
    context: ConversationContext,
    request?: ChatRequestDto,
  ): Promise<{ text: string; actions?: ChatAction[] }> {
    const messages = this.conversationService.getRecentMessages(context);

    // 위치 정보를 시스템 메시지로 주입
    if (context.slots.latitude && context.slots.longitude) {
      // 지역명 캐시: 최초 1회만 coord2region 호출
      if (!context.slots.regionName) {
        const regionName = await this.toolExecutor.resolveRegionName(
          context.slots.latitude,
          context.slots.longitude,
        );
        if (regionName) {
          this.conversationService.updateSlots(context, { regionName });
        }
      }

      const locationInfo = context.slots.regionName
        ? `사용자의 현재 위치: ${context.slots.regionName} (위도 ${context.slots.latitude}, 경도 ${context.slots.longitude}). "내 근처" 요청 시 get_nearby_clubs에 이 좌표를 사용하세요. 날씨 질문 시 get_weather_by_location에 location="${context.slots.regionName}", latitude=${context.slots.latitude}, longitude=${context.slots.longitude}를 모두 전달하세요.`
        : `사용자의 현재 위치: 위도 ${context.slots.latitude}, 경도 ${context.slots.longitude}. "내 근처" 요청 시 get_nearby_clubs에 이 좌표를 사용하세요. 날씨 질문 시 get_weather_by_location에 latitude=${context.slots.latitude}, longitude=${context.slots.longitude}를 전달하세요.`;

      messages.unshift({
        role: 'user',
        content: `[시스템 정보] ${locationInfo} 이 메시지에 대해 직접 응답하지 마세요.`,
      });
    }

    let llmResponse: DeepSeekResponse;
    let iterations = 0;
    let allActions: ChatAction[] = [];

    // 초기 DeepSeek 호출
    llmResponse = await this.deepseekService.chat(messages);

    // 도구 호출 루프
    while (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      if (iterations >= this.MAX_TOOL_ITERATIONS) {
        this.logger.warn('Max tool iterations reached');
        break;
      }

      // 도구 실행
      const toolResults = await this.executeTools(llmResponse.toolCalls, request);

      // UI 액션 생성
      const actions = this.createActionsFromToolResults(llmResponse.toolCalls, toolResults);
      allActions = [...allActions, ...actions];

      // 슬롯 업데이트
      this.updateSlotsFromToolResults(context, llmResponse.toolCalls, toolResults);

      // DeepSeek 계속 호출
      llmResponse = await this.deepseekService.continueWithToolResults(
        messages,
        llmResponse.toolCalls,
        toolResults.map((tr) => ({ name: tr.name, result: tr.result })),
      );

      iterations++;
    }

    // 최종 텍스트 응답 저장
    if (llmResponse.text) {
      this.conversationService.addAssistantMessage(context, llmResponse.text);
    }

    // 상태 업데이트
    this.updateStateFromResponse(context, llmResponse, allActions);

    return {
      text: llmResponse.text || '',
      actions: allActions.length > 0 ? allActions : undefined,
    };
  }

  /**
   * 도구 실행 (create_booking 시 사용자 정보 서버사이드 주입)
   */
  private async executeTools(toolCalls: ToolCall[], request?: ChatRequestDto): Promise<ToolResult[]> {
    this.logger.debug(`Executing ${toolCalls.length} tools`);

    // create_booking에 사용자 정보 서버사이드 주입
    if (request?.userId) {
      toolCalls = toolCalls.map((tc) =>
        tc.name === 'create_booking'
          ? {
              ...tc,
              args: {
                ...tc.args,
                userId: request.userId,
                userName: request.userName,
                userEmail: request.userEmail,
              },
            }
          : tc,
      );
    }

    return this.toolExecutor.executeAll(toolCalls);
  }

  /**
   * 도구 결과에서 UI 액션 생성
   */
  private createActionsFromToolResults(
    toolCalls: ToolCall[],
    results: ToolResult[],
  ): ChatAction[] {
    const actions: ChatAction[] = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const result = results[i];

      if (!result.success) continue;

      switch (call.name) {
        case 'search_clubs':
          if (result.result && (result.result as any).found > 0) {
            actions.push({
              type: 'SHOW_CLUBS',
              data: result.result,
            });
          }
          break;

        case 'search_clubs_with_slots': {
          const searchData = result.result as any;
          if (searchData?.found > 0 && searchData.clubs) {
            for (const club of searchData.clubs) {
              if (club.rounds?.length > 0) {
                actions.push({
                  type: 'SHOW_SLOTS',
                  data: {
                    clubId: club.id,
                    clubName: club.name,
                    clubAddress: club.address,
                    date: searchData.date,
                    availableCount: club.availableSlotCount,
                    rounds: club.rounds,
                    slots: club.rounds
                      .flatMap((r: any) => r.slots.map((s: any) => ({ ...s, courseName: r.name })))
                      .slice(0, 10),
                  },
                });
              }
            }
          }
          break;
        }

        case 'get_available_slots':
          if (result.result && (result.result as any).availableCount > 0) {
            actions.push({
              type: 'SHOW_SLOTS',
              data: result.result,
            });
          }
          break;

        case 'get_weather':
        case 'get_weather_by_location':
          actions.push({
            type: 'SHOW_WEATHER',
            data: result.result,
          });
          break;

        case 'create_booking':
          if ((result.result as any)?.success) {
            const status = (result.result as any)?.status;
            if (status === 'SLOT_RESERVED') {
              actions.push({ type: 'SHOW_PAYMENT', data: result.result });
            } else {
              actions.push({ type: 'BOOKING_COMPLETE', data: result.result });
            }
          }
          break;
      }
    }

    return actions;
  }

  /**
   * 도구 결과에서 슬롯 업데이트
   */
  private updateSlotsFromToolResults(
    context: ConversationContext,
    toolCalls: ToolCall[],
    results: ToolResult[],
  ): void {
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const result = results[i];

      if (!result.success) continue;

      switch (call.name) {
        case 'search_clubs':
          if (call.args.location) {
            this.conversationService.updateSlots(context, {
              location: call.args.location as string,
            });
          }
          break;

        case 'search_clubs_with_slots':
          if (call.args.location) {
            this.conversationService.updateSlots(context, {
              location: call.args.location as string,
            });
          }
          if (call.args.date) {
            this.conversationService.updateSlots(context, {
              date: call.args.date as string,
            });
          }
          if (call.args.playerCount) {
            this.conversationService.updateSlots(context, {
              playerCount: call.args.playerCount as number,
            });
          }
          break;

        case 'get_club_info':
          if (call.args.clubId) {
            this.conversationService.updateSlots(context, {
              clubId: call.args.clubId as string,
            });
          }
          break;

        case 'get_available_slots':
          if (call.args.date) {
            this.conversationService.updateSlots(context, {
              date: call.args.date as string,
            });
          }
          break;

        case 'create_booking':
          if ((result.result as any)?.success) {
            this.conversationService.updateSlots(context, {
              confirmed: true,
            });
          }
          break;
      }
    }
  }

  /**
   * 응답에 따른 상태 업데이트
   */
  private updateStateFromResponse(
    context: ConversationContext,
    response: DeepSeekResponse,
    actions: ChatAction[],
  ): void {
    // 예약 완료 확인
    const bookingComplete = actions.some((a) => a.type === 'BOOKING_COMPLETE');
    if (bookingComplete) {
      this.conversationService.setState(context, 'COMPLETED');
      return;
    }

    // 슬롯 표시 = 확인 대기
    const showingSlots = actions.some((a) => a.type === 'SHOW_SLOTS');
    if (showingSlots) {
      this.conversationService.setState(context, 'CONFIRMING');
      return;
    }

    // 골프장 표시 = 정보 수집 중
    const showingClubs = actions.some((a) => a.type === 'SHOW_CLUBS');
    if (showingClubs) {
      this.conversationService.setState(context, 'COLLECTING');
      return;
    }

    // 기본 상태
    if (context.state === 'IDLE') {
      this.conversationService.setState(context, 'COLLECTING');
    }
  }
}

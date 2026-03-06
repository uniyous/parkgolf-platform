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

    // chatRoomId 저장 (멤버 조회용)
    if (request.chatRoomId && !context.slots.chatRoomId) {
      this.conversationService.updateSlots(context, { chatRoomId: request.chatRoomId });
    }

    // ── Direct Handling (LLM 없음) ──
    // 그룹 예약 핸들러 (우선)
    if (request.sendReminder) return this.handleSendReminder(context, request);
    if (request.finishGroup) return this.handleFinishGroup(context, request);
    if (request.nextTeam) return this.handleNextTeam(context, request);
    if (request.teamMembers) return this.handleTeamMemberSelect(context, request);
    // 기존 핸들러
    if (request.splitPaymentComplete) return this.handleSplitPaymentComplete(context, request);
    if (request.paymentComplete) return this.handlePaymentComplete(context, request);
    if (request.confirmBooking) return this.handleDirectBooking(context, request);
    if (request.cancelBooking) return this.handleCancelBooking(context);
    if (request.selectedSlotId) return this.handleDirectSlotSelect(context, request);
    if (request.selectedClubId) return this.handleDirectClubSelect(context, request);

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
   * 골프장 카드 클릭 → 채팅방 멤버 조회 → SELECT_MEMBERS 카드
   */
  private async handleDirectClubSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { selectedClubId, selectedClubName } = request;

    this.conversationService.updateSlots(context, {
      clubId: selectedClubId,
      clubName: selectedClubName,
    });

    const result = await this.showSelectMembers(
      context,
      `${selectedClubName}이(가) 선택되었어요! 함께 플레이할 멤버를 선택해 주세요.`,
    );
    if (result) return result;

    // chatRoomId 없거나 멤버 조회 실패 → 슬롯 바로 표시 (폴백)
    const date = context.slots.date || this.getTomorrowDate();
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
  private async handleDirectSlotSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
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
      slotPrice: selectedSlotPrice,
      ...(request.selectedGameName && { gameName: request.selectedGameName }),
    });

    // 멤버 선택이 아직 안 된 경우 → SELECT_MEMBERS로 리다이렉트
    if (!context.slots.groupMode) {
      const result = await this.showSelectMembers(
        context,
        '멤버를 선택해 주세요!',
      );
      if (result) return result;
      // 폴백: 멤버 조회 실패 시 1인 예약으로 진행
    }

    // CONFIRM_BOOKING 카드 표시
    const playerCount = context.slots.currentTeamMembers?.length || context.slots.playerCount || 4;
    const slotPrice = selectedSlotPrice || context.slots.slotPrice || 0;
    const price = slotPrice * playerCount;

    const confirmData: Record<string, unknown> = {
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
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
   * 예약 확인 버튼 클릭 → 예약 생성
   * 결제방법에 따라 CONFIRMED(현장결제) 또는 SLOT_RESERVED(카드결제) 분기
   */
  private async handleDirectBooking(
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

      // 더치페이 분기
      if (paymentMethod === 'dutchpay' && (status === 'SLOT_RESERVED' || status === 'CONFIRMED')) {
        this.conversationService.updateSlots(context, {
          bookingId: result.bookingId,
          bookingNumber: result.bookingNumber,
          totalPrice: result.details?.totalPrice,
          bookerId: request.userId,
        });

        const teamMembers = context.slots.currentTeamMembers || [];
        const pricePerPerson = (result.details?.totalPrice || 0) / (teamMembers.length || 1);

        // 분할결제 준비
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

        // 예약자 제외 참여자에게만 정산 카드 브로드캐스트 (예약자에게는 최초 정산카드 미전송)
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

        // 정산 카드는 브로드캐스트로만 전달 (API 응답에서 제외하여 중복 방지)

        message = `팀${teamNumber} 예약이 생성되었어요! 참여자들에게 결제 요청이 전송됩니다.`;
        this.conversationService.setState(context, 'SETTLING');
      } else if (status === 'CONFIRMED') {
        // 현장결제 — Saga 완료, 바로 예약 확정
        if (context.slots.groupMode) {
          // 그룹 모드: TEAM_COMPLETE
          return this.completeTeam(context, request, result);
        }
        actions.push({ type: 'BOOKING_COMPLETE', data: result });
        message = '예약이 완료되었습니다!';
        this.conversationService.updateSlots(context, { confirmed: true });
        this.conversationService.setState(context, 'COMPLETED');
      } else if (status === 'SLOT_RESERVED') {
        // 카드결제 — 슬롯 확보 완료, payment.prepare 원샷 처리
        this.conversationService.updateSlots(context, {
          bookingId: result.bookingId,
          bookingNumber: result.bookingNumber,
          totalPrice: result.details?.totalPrice,
        });

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
  private async handlePaymentComplete(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const actions: ChatAction[] = [];
    let message: string;

    if (request.paymentSuccess) {
      // 결제 성공 → booking 상태 확인 후 TEAM_COMPLETE
      const bookingId = context.slots.bookingId;
      const detail = bookingId ? await this.toolExecutor.getBookingDetail(bookingId) : null;
      if (detail?.status === 'CONFIRMED') {
        const result = {
          bookingId: context.slots.bookingId,
          bookingNumber: context.slots.bookingNumber,
          details: { totalPrice: context.slots.totalPrice },
        };
        return this.completeTeam(context, request, result);
      }
      // 아직 Saga 미완료 → 안내 메시지
      message = '결제가 완료되었어요! 예약 확정 처리 중입니다.';
      this.conversationService.setState(context, 'CONFIRMING');
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
   * bookingId 기반 또는 bookingGroupId 기반
   */
  private async handleSplitPaymentComplete(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    let { bookingId } = context.slots;
    let bookerId = context.slots.bookerId;

    // 비예약자: context에 bookingId 없으면 splitOrderId로 역추적
    let splitStatus: any = null;
    if (!bookingId && request.splitOrderId) {
      splitStatus = await this.toolExecutor.getSplitStatusByOrderId(request.splitOrderId);
      if (splitStatus?.bookingId) {
        bookingId = splitStatus.bookingId;
        this.conversationService.updateSlots(context, { bookingId });
      }
    }

    if (!bookingId) {
      const message = '정산 정보를 찾을 수 없어요. 다시 시도해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // 최신 분할결제 상태 조회 (bookingId 기반)
    if (!splitStatus) {
      splitStatus = await this.toolExecutor.getSplitStatus(bookingId);
    }

    if (!splitStatus) {
      const message = '정산 상태를 조회할 수 없어요.';
      this.conversationService.addAssistantMessage(context, message);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // 비예약자 context에는 bookerId가 없으므로 booking에서 조회
    if (!bookerId && bookingId) {
      bookerId = await this.toolExecutor.getBookingBookerId(bookingId);
    }

    const participants = splitStatus.splits || [];
    const totalParticipants = participants.length;
    const pricePerPerson = participants[0]?.amount || 0;

    // allPaid를 booking-service에 위임 (단일 진실 공급원)
    const settlement = await this.toolExecutor.getSettlementStatus(bookingId);
    const paidCount = settlement?.paidCount
      ?? participants.filter((s: any) => s.status === 'PAID').length;
    const allPaid = settlement?.allPaid
      ?? (paidCount === totalParticipants && totalParticipants > 0);
    const teamNumber = context.slots.currentTeamNumber || 1;

    const actions: ChatAction[] = [{
      type: 'SETTLEMENT_STATUS',
      data: {
        bookingId,
        bookerId: bookerId || 0,
        teamNumber,
        clubName: context.slots.clubName || '',
        gameName: context.slots.gameName || '',
        date: context.slots.date || '',
        slotTime: context.slots.time || '',
        totalParticipants,
        pricePerPerson,
        totalPrice: totalParticipants * pricePerPerson,
        paidCount,
        expiredAt: participants[0]?.expiredAt || '',
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

    const roomId = context.slots.chatRoomId || request.chatRoomId;
    const bid = bookerId || context.slots.bookerId;
    const isBooker = request.userId === bid;

    let message: string;
    if (allPaid) {
      // 전원 결제 완료 → 예약자에게 정산카드 + 채팅방 전체에 예약완료카드

      // 1) 예약자에게 정산현황 카드 (senderId=bookerId → 예약자만 조회 가능)
      if (roomId) {
        const settleMessage = `모든 결제가 완료되었습니다! (${paidCount}/${totalParticipants})`;
        const bookerOnly = bid ? [bid] : participants.map((s: any) => s.userId);
        this.toolExecutor.broadcastSettlementCard(
          roomId,
          bookerOnly,
          actions[0].data as Record<string, unknown>,
          settleMessage,
          bid || undefined,
          bid || 0,
        );
      }

      // 2) 채팅방 전체에 TEAM_COMPLETE 브로드캐스트 (senderId=0 → 전체 조회 가능)
      if (context.slots.groupMode) {
        // 예약자 context: completeTeam()이 TEAM_COMPLETE 브로드캐스트 + completedTeams 관리
        const result = {
          bookingId,
          bookingNumber: context.slots.bookingNumber || '',
          details: {
            totalPrice: totalParticipants * pricePerPerson,
          },
        };
        return this.completeTeam(context, request, result);
      }

      // 비예약자 context → 직접 TEAM_COMPLETE 브로드캐스트
      // (비예약자 context에는 groupMode/clubName 등이 없으므로 booking 조회로 보완)
      if (roomId) {
        const bookingDetail = await this.toolExecutor.getBookingDetail(bookingId);
        const teamCompleteData: Record<string, unknown> = {
          teamNumber: context.slots.currentTeamNumber || 1,
          bookingId,
          bookingNumber: context.slots.bookingNumber || bookingDetail?.bookingNumber || '',
          clubName: context.slots.clubName || bookingDetail?.clubName || '',
          date: context.slots.date || bookingDetail?.bookingDate || '',
          slotTime: context.slots.time || bookingDetail?.startTime || '',
          gameName: context.slots.gameName || bookingDetail?.gameName || '',
          participants: participants.map((s: any) => ({ userId: s.userId, userName: s.userName })),
          totalPrice: totalParticipants * pricePerPerson,
          paymentMethod: context.slots.paymentMethod || bookingDetail?.paymentMethod || 'dutchpay',
          hasMoreTeams: true,
        };
        this.toolExecutor.broadcastTeamCompleteCard(roomId, teamCompleteData);
      }

      message = '결제가 완료되었습니다!';
      this.conversationService.setState(context, 'COMPLETED');
    } else if (isBooker) {
      message = `결제가 확인되었어요. (${paidCount}/${totalParticipants})`;

      // 예약자에게만 정산현황 카드 (진행중 상태)
      if (roomId) {
        const bookerOnly = bid ? [bid] : participants.map((s: any) => s.userId);
        this.toolExecutor.broadcastSettlementCard(
          roomId,
          bookerOnly,
          actions[0].data as Record<string, unknown>,
          message,
          bid || undefined,
          bid || 0,
        );
      }
    } else {
      // 비예약자 결제 완료 → 예약자에게 갱신된 정산카드 브로드캐스트
      message = '결제가 완료되었습니다!';

      if (roomId && bid) {
        const bookerOnly = [bid];
        const bookerMessage = `결제가 확인되었어요. (${paidCount}/${totalParticipants})`;
        this.toolExecutor.broadcastSettlementCard(
          roomId,
          bookerOnly,
          actions[0].data as Record<string, unknown>,
          bookerMessage,
          bid,
          bid,
        );
      }
    }

    this.conversationService.addAssistantMessage(context, message);

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
    };
  }

  // ── 팀 예약 핸들러 (팀 단위 순차) ──

  /**
   * 팀 멤버 선택 → 슬롯 조회 (SHOW_SLOTS)
   */
  private async handleTeamMemberSelect(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const { teamMembers } = request;
    if (!teamMembers || teamMembers.length === 0) {
      const message = '멤버를 선택해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return { conversationId: context.conversationId, message, state: context.state };
    }

    // 팀 모드 활성화
    this.conversationService.updateSlots(context, {
      groupMode: true,
      currentTeamNumber: context.slots.currentTeamNumber || 1,
      currentTeamMembers: teamMembers,
      playerCount: teamMembers.length,
    });

    // 슬롯이 이미 선택되어 있으면 (검색 결과에서 바로 선택한 경우) → CONFIRM_BOOKING 직행
    if (context.slots.slotId && context.slots.time) {
      return this.handleDirectSlotSelect(context, {
        ...request,
        selectedSlotId: context.slots.slotId,
        selectedSlotTime: context.slots.time,
        selectedSlotPrice: context.slots.slotPrice,
      } as ChatRequestDto);
    }

    const date = context.slots.date || this.getTomorrowDate();
    const clubId = context.slots.clubId;

    if (!clubId) {
      const message = '골프장이 선택되지 않았어요. 골프장을 먼저 선택해 주세요.';
      this.conversationService.addAssistantMessage(context, message);
      return { conversationId: context.conversationId, message, state: context.state };
    }

    // 슬롯 조회
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
  private async handleNextTeam(
    context: ConversationContext,
    _request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const nextTeamNumber = (context.slots.currentTeamNumber || 1) + 1;
    this.conversationService.updateSlots(context, {
      currentTeamNumber: nextTeamNumber,
      currentTeamMembers: undefined,
      groupMode: false, // 다음 팀은 멤버 선택부터 다시
      slotId: undefined,
      time: undefined,
      slotPrice: undefined,
    });

    const result = await this.showSelectMembers(
      context,
      `팀${nextTeamNumber} 멤버를 선택해 주세요!`,
    );
    if (result) return result;

    const message = '채팅방 멤버를 조회할 수 없어요.';
    this.conversationService.addAssistantMessage(context, message);
    return { conversationId: context.conversationId, message, state: context.state };
  }

  /**
   * "종료" 버튼 → 전체 completedTeams 요약 (BOOKING_COMPLETE)
   */
  private async handleFinishGroup(
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

    // 채팅방에 SYSTEM 메시지 전송
    if (context.slots.chatRoomId) {
      const systemMsg = `[그룹 예약 완료] ${completedTeams.length}팀, 총 ${totalMembers}명 — ${context.slots.clubName} (${context.slots.date})`;
      this.toolExecutor.sendSystemMessage(context.slots.chatRoomId, systemMsg);
    }

    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'BOOKING_COMPLETE', data: summaryData }],
    };
  }

  /**
   * 리마인더 전송
   */
  private async handleSendReminder(
    context: ConversationContext,
    _request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const chatRoomId = context.slots.chatRoomId;
    const currentTeamMembers = context.slots.currentTeamMembers || [];
    const bookerId = context.slots.bookerId;

    // 미결제 참여자에게 push 알림 재발송
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

  /**
   * 팀 완료 헬퍼 — completedTeams에 추가 + TEAM_COMPLETE 카드 반환
   */
  private completeTeam(
    context: ConversationContext,
    request: ChatRequestDto,
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

    // 채팅방 멤버 수로 hasMoreTeams 판단
    const allMemberCount = teamMembers.length; // 현재 팀 멤버 수 (간이 판단)
    const totalAssigned = completedTeams.reduce((sum, t) => sum + t.members.length, 0);
    // 채팅방 전체 멤버 수를 모르므로, 항상 true로 설정하고 UI에서 판단 가능
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

    // TEAM_COMPLETE 카드를 senderId=0으로 채팅방 전체 브로드캐스트
    // 브로드캐스트 시 API 응답에서 actions 제외 (user-api가 senderId=payer로 중복 저장 방지)
    const roomId = context.slots.chatRoomId;
    if (roomId) {
      this.toolExecutor.broadcastTeamCompleteCard(roomId, teamCompleteData);
      return {
        conversationId: context.conversationId,
        message,
        state: context.state,
      };
    }

    // chatRoomId 없는 경우 (폴백): API 응답으로 직접 전달
    return {
      conversationId: context.conversationId,
      message,
      state: context.state,
      actions: [{ type: 'TEAM_COMPLETE', data: teamCompleteData }],
    };
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
   * SELECT_MEMBERS 카드 표시 헬퍼
   * handleDirectClubSelect, handleDirectSlotSelect, handleNextTeam에서 공유
   */
  private async showSelectMembers(
    context: ConversationContext,
    messageText: string,
  ): Promise<ChatResponseDto | null> {
    const chatRoomId = context.slots.chatRoomId;
    if (!chatRoomId) return null;

    const allMembers = await this.toolExecutor.getChatRoomMembers(chatRoomId);
    if (!allMembers || allMembers.length === 0) return null;

    const teamNumber = context.slots.currentTeamNumber || 1;
    const completedTeams = context.slots.completedTeams || [];

    // 이미 배정된 멤버 제외
    const assignedUserIds = new Set<number>();
    for (const team of completedTeams) {
      for (const m of team.members) {
        assignedUserIds.add(m.userId);
      }
    }
    const availableMembers = allMembers.filter((m) => !assignedUserIds.has(m.userId));

    const selectData = {
      teamNumber,
      clubName: context.slots.clubName || '',
      date: context.slots.date || this.getTomorrowDate(),
      maxPlayers: 4,
      assignedTeams: completedTeams.map((t) => ({
        teamNumber: t.teamNumber,
        slotTime: t.slotTime,
        gameName: t.gameName,
        members: t.members,
      })),
      availableMembers,
    };

    this.conversationService.addAssistantMessage(context, messageText);
    this.conversationService.setState(context, 'SELECTING_MEMBERS');

    return {
      conversationId: context.conversationId,
      message: messageText,
      state: context.state,
      actions: [{ type: 'SELECT_MEMBERS', data: selectData }],
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
    const toolHistory: Array<{
      toolCalls: ToolCall[];
      results: Array<{ name: string; result: unknown }>;
    }> = [];

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

      // 도구 호출/결과 누적
      toolHistory.push({
        toolCalls: llmResponse.toolCalls,
        results: toolResults.map((tr) => ({ name: tr.name, result: tr.result })),
      });

      // DeepSeek 계속 호출 (전체 도구 히스토리 전달)
      llmResponse = await this.deepseekService.continueWithToolResults(
        messages,
        toolHistory,
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
      toolCalls = toolCalls.map((tc) => {
        if (tc.name === 'create_booking') {
          return {
            ...tc,
            args: {
              ...tc.args,
              userId: request.userId,
              userName: request.userName,
              userEmail: request.userEmail,
            },
          };
        }
        return tc;
      });
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
                      .flatMap((r: any) => r.slots.map((s: any) => ({ ...s, gameName: r.name })))
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

        case 'search_clubs_with_slots': {
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
          // 검색 결과가 단일 클럽이면 clubId 자동 설정
          const searchResult = result.result as any;
          if (searchResult?.found === 1 && searchResult.clubs?.[0]) {
            const club = searchResult.clubs[0];
            this.conversationService.updateSlots(context, {
              clubId: String(club.id),
              clubName: club.name,
            });
          }
          break;
        }

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

    // 멤버 선택 표시 = 멤버 선택 중
    const selectingMembers = actions.some((a) => a.type === 'SELECT_MEMBERS');
    if (selectingMembers) {
      this.conversationService.setState(context, 'SELECTING_MEMBERS');
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

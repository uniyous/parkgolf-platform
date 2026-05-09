import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { BookingCompletionService } from './booking-completion.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatAction,
  ConversationContext,
} from '../dto/chat.dto';

/**
 * 결제 완료/실패 후속 처리.
 * - 단일 결제 (handlePaymentComplete)
 * - 분할(더치페이) 결제 (handleSplitPaymentComplete)
 */
@Injectable()
export class PaymentResultHandlerService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly bookingCompletion: BookingCompletionService,
  ) {}

  /**
   * 결제 완료/실패 후 결과 처리
   */
  async handlePaymentComplete(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const actions: ChatAction[] = [];
    let message: string;

    if (request.paymentSuccess) {
      const bookingId = context.slots.bookingId;
      const detail = bookingId ? await this.toolExecutor.getBookingDetail(bookingId) : null;
      if (detail?.status === 'CONFIRMED') {
        const result = {
          bookingId: context.slots.bookingId,
          bookingNumber: context.slots.bookingNumber,
          details: { totalPrice: context.slots.totalPrice },
        };
        return this.bookingCompletion.completeTeam(context, request, result);
      }
      message = '결제가 완료되었어요! 예약 확정 처리 중입니다.';
      this.conversationService.setState(context, 'CONFIRMING');
    } else {
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
   * 분할결제 완료 → 갱신된 정산 카드 반환 (bookingId 또는 splitOrderId 기반)
   */
  async handleSplitPaymentComplete(
    context: ConversationContext,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    let { bookingId } = context.slots;
    let bookerId = context.slots.bookerId;

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

    if (!bookerId && bookingId) {
      bookerId = await this.toolExecutor.getBookingBookerId(bookingId);
    }

    const participants = splitStatus.splits || [];
    const totalParticipants = participants.length;
    const pricePerPerson = participants[0]?.amount || 0;

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
      // 1) 예약자에게 정산현황 카드 (senderId=bookerId)
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

      // 2) 채팅방 전체에 TEAM_COMPLETE
      if (context.slots.groupMode) {
        const result = {
          bookingId,
          bookingNumber: context.slots.bookingNumber || '',
          details: {
            totalPrice: totalParticipants * pricePerPerson,
          },
        };
        return this.bookingCompletion.completeTeam(context, request, result);
      }

      // 비예약자 context → 직접 TEAM_COMPLETE 브로드캐스트
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
      actions: !isBooker || allPaid ? actions : undefined,
    };
  }
}

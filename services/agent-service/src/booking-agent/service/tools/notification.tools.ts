import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class NotificationTools {
  private readonly logger = new Logger(NotificationTools.name);

  constructor(@Inject('NOTIFY_SERVICE') private readonly notifyClient: ClientProxy) {}

  emitSplitPaymentNotification(data: {
    bookerId: number;
    bookerName: string;
    bookingGroupId: number;
    chatRoomId: string;
    participants: Array<{ userId: number; userName: string; amount: number }>;
  }): void {
    try {
      this.notifyClient.emit('payment.splitRequested', data);
    } catch (error) {
      this.logger.error('emitSplitPaymentNotification failed', error);
    }
  }

  /**
   * 정산 카드 브로드캐스트 (fire-and-forget)
   * AI_ASSISTANT 메시지 1개를 chat-gateway로 emit → Socket.IO 룸 브로드캐스트 + DB 저장.
   * 클라이언트는 metadata.targetUserIds로 본인 해당 여부를 판단.
   */
  broadcastSettlementCard(
    roomId: string,
    targetUserIds: number[],
    settlementData: Record<string, unknown>,
    content?: string,
    bookerUserId?: number,
    senderId?: number,
  ): void {
    const metadata = JSON.stringify({
      conversationId: null,
      state: 'SETTLING',
      actions: [{ type: 'SETTLEMENT_STATUS', data: settlementData }],
      targetUserIds,
      bookerUserId: bookerUserId || null,
    });

    const message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: senderId ?? 0,
      senderName: 'AI 예약 도우미',
      content: content || '더치페이 결제 요청이 도착했습니다.',
      messageType: 'AI_ASSISTANT',
      metadata,
      createdAt: new Date().toISOString(),
    };

    try {
      this.notifyClient.emit('chat.message.room', { roomId, message });
      this.logger.log(
        `broadcastSettlementCard emitted - roomId=${roomId}, msgId=${message.id}, targetUserIds=${JSON.stringify(targetUserIds)}`,
      );
    } catch (error) {
      this.logger.error('broadcastSettlementCard NATS emit failed', error);
    }
  }

  /**
   * 팀 완료 카드 브로드캐스트 (senderId=0 → 채팅방 전체 조회 가능)
   */
  broadcastTeamCompleteCard(roomId: string, teamCompleteData: Record<string, unknown>): void {
    const metadata = JSON.stringify({
      conversationId: null,
      state: 'TEAM_COMPLETE',
      actions: [{ type: 'TEAM_COMPLETE', data: teamCompleteData }],
    });

    const message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: 0,
      senderName: 'AI 예약 도우미',
      content: '예약이 완료되었어요!',
      messageType: 'AI_ASSISTANT',
      metadata,
      createdAt: new Date().toISOString(),
    };

    try {
      this.notifyClient.emit('chat.message.room', { roomId, message });
      this.logger.log(
        `broadcastTeamCompleteCard emitted - roomId=${roomId}, msgId=${message.id}`,
      );
    } catch (error) {
      this.logger.error('broadcastTeamCompleteCard NATS emit failed', error);
    }
  }

  /**
   * 채팅방에 SYSTEM 메시지 전송 (chat-gateway → JetStream → DB)
   */
  sendSystemMessage(roomId: string, content: string): void {
    const message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: 0,
      senderName: 'SYSTEM',
      content,
      messageType: 'SYSTEM',
      createdAt: new Date().toISOString(),
    };

    try {
      this.notifyClient.emit('chat.message.room', { roomId, message });
    } catch (error) {
      this.logger.error('sendSystemMessage NATS emit failed', error);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import { AiChatRequestDto, CreateChatRoomDto, MessageType } from './dto/chat.dto';

export interface ChatParticipant {
  id: string;
  odUserId: number;
  userName: string;
  userEmail?: string;
  profileImageUrl?: string;
  joinedAt: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  messageType: string;
  createdAt: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Chat Service for User API
 *
 * NATS Patterns:
 * - chat.rooms.list: 채팅방 목록 조회
 * - chat.rooms.get: 채팅방 상세 조회
 * - chat.rooms.create: 채팅방 생성
 * - chat.rooms.removeMember: 채팅방 나가기
 * - chat.messages.list: 메시지 목록 조회
 * - chat.messages.save: 메시지 저장
 * - chat.messages.markRead: 읽음 처리
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  /**
   * 채팅방 목록 조회
   */
  async getChatRooms(userId: number): Promise<ApiResponse<ChatRoom[]>> {
    this.logger.log(`Get chat rooms: userId=${userId}`);
    return this.natsClient.send('chat.rooms.list', { userId }, NATS_TIMEOUTS.QUICK);
  }

  /**
   * 채팅방 상세 조회
   */
  async getChatRoom(roomId: string): Promise<ApiResponse<ChatRoom>> {
    this.logger.log(`Get chat room: roomId=${roomId}`);
    return this.natsClient.send('chat.rooms.get', { roomId }, NATS_TIMEOUTS.QUICK);
  }

  /**
   * 채팅방 생성
   */
  async createChatRoom(
    userId: number,
    userName: string,
    userEmail: string,
    dto: CreateChatRoomDto,
  ): Promise<ApiResponse<ChatRoom>> {
    this.logger.log(`Create chat room: userId=${userId}, type=${dto.type}`);

    // 참여자 목록에 현재 사용자 추가
    const participantIds = dto.participant_ids.map((id) => parseInt(id, 10));
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    // IAM에서 참여자 정보 조회
    const memberNames: Record<number, string> = {};
    const memberEmails: Record<number, string> = {};
    memberNames[userId] = userName;
    memberEmails[userId] = userEmail;

    // 다른 참여자 정보를 IAM에서 조회
    const otherIds = participantIds.filter((id) => id !== userId);
    if (otherIds.length > 0) {
      const userInfos = await this.fetchUserInfos(otherIds);
      for (const info of userInfos) {
        memberNames[info.id] = info.name;
        memberEmails[info.id] = info.email;
      }
    }

    const createData = {
      name: dto.name,
      type: dto.type,
      memberIds: participantIds,
      memberNames,
      memberEmails,
    };

    return this.natsClient.send('chat.rooms.create', createData, NATS_TIMEOUTS.QUICK);
  }

  /**
   * 채팅방 나가기
   */
  async leaveChatRoom(roomId: string, userId: number): Promise<ApiResponse<void>> {
    this.logger.log(`Leave chat room: roomId=${roomId}, userId=${userId}`);
    return this.natsClient.send(
      'chat.rooms.removeMember',
      { roomId, userId },
      NATS_TIMEOUTS.QUICK,
    );
  }

  /**
   * 메시지 목록 조회 (cursor 기반)
   */
  async getMessages(
    roomId: string,
    userId: number,
    cursor?: string,
    limit: number = 50,
  ): Promise<ApiResponse<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: string | null }>> {
    this.logger.log(`Get messages: roomId=${roomId}, cursor=${cursor}, limit=${limit}`);

    return this.natsClient.send(
      'chat.messages.list',
      { roomId, userId, cursor, limit },
      NATS_TIMEOUTS.LIST_QUERY,
    );
  }

  /**
   * 메시지 전송
   */
  async sendMessage(
    roomId: string,
    userId: number,
    userName: string,
    content: string,
    messageType: MessageType = MessageType.TEXT,
  ): Promise<ApiResponse<ChatMessage>> {
    this.logger.log(`Send message: roomId=${roomId}, userId=${userId}`);

    const messageData = {
      id: randomUUID(),
      roomId,
      senderId: userId,
      senderName: userName,
      content,
      type: messageType,
      createdAt: new Date().toISOString(),
    };

    return this.natsClient.send('chat.messages.save', messageData, NATS_TIMEOUTS.QUICK);
  }

  /**
   * 메시지 읽음 처리
   */
  async markAsRead(roomId: string, userId: number, messageId?: string): Promise<ApiResponse<void>> {
    this.logger.log(`Mark as read: roomId=${roomId}, userId=${userId}, messageId=${messageId ?? '(latest)'}`);
    return this.natsClient.send(
      'chat.messages.markRead',
      { roomId, userId, ...(messageId && { messageId }) },
      NATS_TIMEOUTS.QUICK,
    );
  }

  /**
   * 채팅방 멤버 초대
   */
  async addMembers(roomId: string, userIds: number[]): Promise<ApiResponse<void>> {
    this.logger.log(`Add members: roomId=${roomId}, userIds=${userIds}`);

    // IAM에서 사용자 정보 조회
    const userInfos = await this.fetchUserInfos(userIds);
    const userMap = new Map(userInfos.map((u) => [u.id, u]));

    await Promise.all(
      userIds.map((userId) => {
        const info = userMap.get(userId);
        return this.natsClient.send(
          'chat.rooms.addMember',
          {
            roomId,
            userId,
            userName: info?.name,
            userEmail: info?.email || null,
          },
          NATS_TIMEOUTS.QUICK,
        );
      }),
    );
    return { success: true, data: undefined } as ApiResponse<void>;
  }

  /**
   * AI 예약 도우미에게 메시지 전송
   */
  async sendAiMessage(
    roomId: string,
    userId: number,
    userName: string,
    userEmail: string,
    dto: AiChatRequestDto,
  ) {
    this.logger.log(`Send AI message: roomId=${roomId}, userId=${userId}`);

    // 1. 사용자 메시지를 chat-service에 AI_USER로 저장 (fire-and-forget — AI 흐름 차단 방지)
    const userMessageData = {
      id: randomUUID(),
      roomId,
      senderId: userId,
      senderName: userName,
      content: dto.message,
      type: 'AI_USER',
      createdAt: new Date().toISOString(),
    };
    this.natsClient.send('chat.messages.save', userMessageData, NATS_TIMEOUTS.QUICK).catch((err) => {
      this.logger.warn(`Failed to save user message: ${err}`);
    });

    // 2. agent-service에 AI 채팅 요청 (60초 타임아웃)
    const agentResponse = await this.natsClient.send<any>(
      'agent.chat',
      {
        userId,
        userName,
        userEmail,
        message: dto.message,
        conversationId: dto.conversationId,
        chatRoomId: roomId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        selectedClubId: dto.selectedClubId,
        selectedClubName: dto.selectedClubName,
        selectedSlotId: dto.selectedSlotId,
        selectedSlotTime: dto.selectedSlotTime,
        selectedSlotPrice: dto.selectedSlotPrice,
        selectedCourseName: dto.selectedCourseName,
        confirmBooking: dto.confirmBooking,
        cancelBooking: dto.cancelBooking,
        paymentMethod: dto.paymentMethod,
        paymentComplete: dto.paymentComplete,
        paymentSuccess: dto.paymentSuccess,
        // 그룹 예약 필드 (팀 단위 순차)
        confirmGroupBooking: dto.confirmGroupBooking,
        teamMembers: dto.teamMembers,
        nextTeam: dto.nextTeam,
        finishGroup: dto.finishGroup,
        sendReminder: dto.sendReminder,
        // 분할결제 완료 필드
        splitPaymentComplete: dto.splitPaymentComplete,
        splitOrderId: dto.splitOrderId,
      },
      NATS_TIMEOUTS.PAYMENT, // 60초 - AI 처리 시간 고려
    );

    // 3. AI 응답을 chat-service에 AI_ASSISTANT로 저장 (fire-and-forget — 응답 반환 차단 방지)
    if (agentResponse?.success && agentResponse?.data) {
      const aiData = agentResponse.data;
      const metadata = JSON.stringify({
        conversationId: aiData.conversationId,
        state: aiData.state,
        actions: aiData.actions,
      });

      this.natsClient.send('chat.messages.save', {
        id: randomUUID(),
        roomId,
        senderId: userId,
        senderName: 'AI 예약 도우미',
        content: aiData.message || '',
        type: 'AI_ASSISTANT',
        metadata,
        createdAt: new Date().toISOString(),
      }, NATS_TIMEOUTS.QUICK).catch((err) => {
        this.logger.warn(`Failed to save AI message: ${err}`);
      });
    }

    // 4. agent-service 응답 그대로 반환 (BFF 패스스루)
    return agentResponse;
  }

  /**
   * 읽지 않은 메시지 수 조회
   */
  async getUnreadCount(roomId: string, userId: number): Promise<ApiResponse<{ count: number }>> {
    this.logger.log(`Get unread count: roomId=${roomId}, userId=${userId}`);
    return this.natsClient.send(
      'chat.messages.unreadCount',
      { roomId, userId },
      NATS_TIMEOUTS.QUICK,
    );
  }

  /**
   * IAM에서 사용자 정보 일괄 조회
   */
  private async fetchUserInfos(userIds: number[]): Promise<{ id: number; name: string; email: string }[]> {
    const results: { id: number; name: string; email: string }[] = [];
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const response = await this.natsClient.send<any>(
            'iam.users.getById',
            { userId: String(userId) },
            NATS_TIMEOUTS.QUICK,
          );
          if (response.success && response.data) {
            results.push({
              id: Number(response.data.id),
              name: response.data.name,
              email: response.data.email,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch user info for userId=${userId}: ${error}`);
        }
      }),
    );
    return results;
  }
}

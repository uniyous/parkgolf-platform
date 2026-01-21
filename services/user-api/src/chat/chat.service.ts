import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import { CreateChatRoomDto, MessageType } from './dto/chat.dto';

export interface ChatParticipant {
  id: string;
  odUserId: number;
  userName: string;
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
    dto: CreateChatRoomDto,
  ): Promise<ApiResponse<ChatRoom>> {
    this.logger.log(`Create chat room: userId=${userId}, type=${dto.type}`);

    // 참여자 목록에 현재 사용자 추가
    const participantIds = dto.participant_ids.map((id) => parseInt(id, 10));
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    // memberNames 구성 (현재 사용자 이름만 알고 있음)
    const memberNames: Record<number, string> = {};
    memberNames[userId] = userName;
    // 다른 참여자는 임시로 User{id} 사용 (chat-service에서 처리)
    participantIds.forEach((id) => {
      if (!memberNames[id]) {
        memberNames[id] = `User${id}`;
      }
    });

    const createData = {
      name: dto.name,
      type: dto.type,
      memberIds: participantIds,
      memberNames,
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
   * 메시지 목록 조회
   */
  async getMessages(
    roomId: string,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ): Promise<ApiResponse<{ messages: ChatMessage[]; hasMore: boolean }>> {
    this.logger.log(`Get messages: roomId=${roomId}, page=${page}, limit=${limit}`);

    // cursor 기반 pagination으로 변환
    const skip = (page - 1) * limit;

    return this.natsClient.send(
      'chat.messages.list',
      { roomId, userId, limit, skip },
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
      messageType,
      createdAt: new Date().toISOString(),
    };

    return this.natsClient.send('chat.messages.save', messageData, NATS_TIMEOUTS.QUICK);
  }

  /**
   * 메시지 읽음 처리
   */
  async markAsRead(roomId: string, userId: number, messageId: string): Promise<ApiResponse<void>> {
    this.logger.log(`Mark as read: roomId=${roomId}, userId=${userId}, messageId=${messageId}`);
    return this.natsClient.send(
      'chat.messages.markRead',
      { roomId, userId, messageId },
      NATS_TIMEOUTS.QUICK,
    );
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
}

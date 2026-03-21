import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, Prisma } from '@prisma/client';
import { AppException, Errors } from '../common/exceptions';

export interface SaveMessageDto {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  messageType: MessageType;
  metadata?: string;
  createdAt: string;
}

export interface GetMessagesDto {
  roomId: string;
  userId?: number;
  cursor?: string;
  limit?: number;
}

export interface MarkReadDto {
  roomId: string;
  userId: number;
  messageId?: string;
}

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  // 메시지 저장
  async saveMessage(dto: SaveMessageDto) {
    const { id, roomId, senderId, senderName, content, messageType, metadata, createdAt } = dto;

    // upsert 패턴: create 시도 → P2002 unique constraint 시 기존 레코드 반환
    // NATS RPC + JetStream 동시 저장으로 인한 race condition 방지
    let message;
    try {
      message = await this.prisma.chatMessage.create({
        data: {
          id,
          roomId,
          senderId,
          senderName,
          content,
          type: messageType,
          metadata,
          createdAt: new Date(createdAt),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.chatMessage.findUnique({ where: { id } });
        if (existing) return this.toMessageResponse(existing);
      }
      throw error;
    }

    // 채팅방 updatedAt 갱신
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    this.logger.debug(`Saved message: ${id} in room ${roomId}`);
    return this.toMessageResponse(message);
  }

  // 메시지 목록 조회 (cursor pagination)
  async getMessages(dto: GetMessagesDto) {
    const { roomId, userId, cursor, limit = DEFAULT_PAGE_SIZE } = dto;

    // AI 메시지(AI_USER, AI_ASSISTANT)는 본인만 볼 수 있도록 필터링
    // senderId=0인 AI_ASSISTANT는 브로드캐스트 메시지 (클라이언트에서 targetUserIds 필터링)
    const aiFilter = userId
      ? {
          OR: [
            { type: { notIn: [MessageType.AI_USER, MessageType.AI_ASSISTANT] } },
            { type: { in: [MessageType.AI_USER, MessageType.AI_ASSISTANT] }, senderId: userId },
            { type: MessageType.AI_ASSISTANT, senderId: 0 },
          ],
        }
      : {};

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        deletedAt: null,
        ...(cursor && {
          createdAt: { lt: new Date(cursor) },
        }),
        ...aiFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // 다음 페이지 여부 확인용
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

    return {
      messages: data.reverse().map((m) => this.toMessageResponse(m)), // 오래된 순으로 반환
      hasMore,
      nextCursor,
    };
  }

  // 읽음 처리
  async markRead(dto: MarkReadDto) {
    const { roomId, userId, messageId } = dto;

    // messageId가 없으면 최신 메시지 조회
    const resolvedMessageId = messageId ?? (
      await this.prisma.chatMessage.findFirst({
        where: { roomId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
    )?.id;

    // 멤버의 마지막 읽은 시각 업데이트
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId },
      data: {
        ...(resolvedMessageId && { lastReadMessageId: resolvedMessageId }),
        lastReadAt: new Date(),
      },
    });

    // 상세 읽음 기록 (messageId가 있는 경우만)
    if (resolvedMessageId) {
      await this.prisma.messageRead.upsert({
        where: {
          messageId_userId: { messageId: resolvedMessageId, userId },
        },
        create: { messageId: resolvedMessageId, userId },
        update: { readAt: new Date() },
      });
    }

    return { success: true };
  }

  // 안읽은 메시지 수
  async getUnreadCount(roomId: string, userId: number) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!member || !member.lastReadAt) {
      // 읽은 적 없으면 전체 메시지 수
      return this.prisma.chatMessage.count({
        where: { roomId, deletedAt: null },
      });
    }

    return this.prisma.chatMessage.count({
      where: {
        roomId,
        deletedAt: null,
        createdAt: { gt: member.lastReadAt },
      },
    });
  }

  // 메시지 삭제 (soft delete)
  async deleteMessage(messageId: string, userId: number) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppException(Errors.Chat.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== userId) {
      throw new AppException(Errors.Chat.NOT_AUTHORIZED);
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 사용자 탈퇴 시 채팅 데이터 익명화
   */
  async anonymizeUserData(userId: number): Promise<number> {
    const DELETED_LABEL = '[탈퇴한 회원]';

    const [memberResult, messageResult] = await this.prisma.$transaction([
      this.prisma.chatRoomMember.updateMany({
        where: { userId },
        data: {
          userName: DELETED_LABEL,
          userEmail: null,
        },
      }),
      this.prisma.chatMessage.updateMany({
        where: { senderId: userId },
        data: {
          senderName: DELETED_LABEL,
        },
      }),
    ]);

    return memberResult.count + messageResult.count;
  }

  /** Prisma ChatMessage → 외부 응답 변환 (type → messageType) */
  private toMessageResponse(msg: { type: MessageType; [key: string]: unknown }) {
    const { type, ...rest } = msg;
    return { ...rest, messageType: type };
  }
}

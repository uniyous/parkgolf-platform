import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MessageType } from '@prisma/client';

export interface SaveMessageDto {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  type: MessageType;
  createdAt: string;
}

export interface GetMessagesDto {
  roomId: string;
  cursor?: string;
  limit?: number;
}

export interface MarkReadDto {
  roomId: string;
  userId: number;
  messageId: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  // 메시지 저장
  async saveMessage(dto: SaveMessageDto) {
    const { id, roomId, senderId, senderName, content, type, createdAt } = dto;

    // 중복 체크 (idempotency)
    const existing = await this.prisma.chatMessage.findUnique({
      where: { id },
    });

    if (existing) {
      return existing;
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        id,
        roomId,
        senderId,
        senderName,
        content,
        type,
        createdAt: new Date(createdAt),
      },
    });

    // 채팅방 updatedAt 갱신
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    this.logger.debug(`Saved message: ${id} in room ${roomId}`);
    return message;
  }

  // 메시지 목록 조회 (cursor pagination)
  async getMessages(dto: GetMessagesDto) {
    const { roomId, cursor, limit = 50 } = dto;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        deletedAt: null,
        ...(cursor && {
          createdAt: { lt: new Date(cursor) },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // 다음 페이지 여부 확인용
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

    return {
      messages: data.reverse(), // 오래된 순으로 반환
      hasMore,
      nextCursor,
    };
  }

  // 읽음 처리
  async markRead(dto: MarkReadDto) {
    const { roomId, userId, messageId } = dto;

    // 멤버의 마지막 읽은 메시지 업데이트
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId },
      data: {
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      },
    });

    // 상세 읽음 기록 (선택적)
    await this.prisma.messageRead.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });

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
      return { success: false, error: 'Message not found' };
    }

    if (message.senderId !== userId) {
      return { success: false, error: 'Not authorized' };
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}

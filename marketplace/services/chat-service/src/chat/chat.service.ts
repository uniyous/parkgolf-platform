import { Injectable, Logger } from '@nestjs/common';
import { eq, and, or, isNull, lt, gt, inArray, notInArray, desc, count } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { chatMessages, chatRooms, chatRoomMembers, messageReads, type ChatMessageRow } from '../db/schema';
import { MessageType } from '../contracts/enums';
import { isUniqueViolation } from '../common/db/db-error';
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

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  // 메시지 저장
  async saveMessage(dto: SaveMessageDto) {
    const { id, roomId, senderId, senderName, content, messageType, metadata, createdAt } = dto;

    // insert 시도 → 23505(unique) 시 기존 레코드 반환 (NATS RPC + JetStream 동시 저장 race 방지)
    let message: ChatMessageRow;
    try {
      const [created] = await this.db
        .insert(chatMessages)
        .values({
          id,
          roomId,
          senderId,
          senderName,
          content,
          type: messageType,
          metadata,
          createdAt: new Date(createdAt),
        })
        .returning();
      message = created;
    } catch (error) {
      if (isUniqueViolation(error)) {
        const [existing] = await this.db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.id, id))
          .limit(1);
        if (existing) return this.toMessageResponse(existing);
      }
      throw error;
    }

    // 채팅방 updatedAt 갱신
    await this.db.update(chatRooms).set({ updatedAt: new Date() }).where(eq(chatRooms.id, roomId));

    this.logger.debug(`Saved message: ${id} in room ${roomId}`);
    return this.toMessageResponse(message);
  }

  // 메시지 목록 조회 (cursor pagination)
  async getMessages(dto: GetMessagesDto) {
    const { roomId, userId, cursor, limit = DEFAULT_PAGE_SIZE } = dto;

    // AI 메시지(AI_USER, AI_ASSISTANT)는 본인만, senderId=0 AI_ASSISTANT는 브로드캐스트
    const aiCondition = userId
      ? or(
          notInArray(chatMessages.type, [MessageType.AI_USER, MessageType.AI_ASSISTANT]),
          and(
            inArray(chatMessages.type, [MessageType.AI_USER, MessageType.AI_ASSISTANT]),
            eq(chatMessages.senderId, userId),
          ),
          and(eq(chatMessages.type, MessageType.AI_ASSISTANT), eq(chatMessages.senderId, 0)),
        )
      : undefined;

    const messages = await this.db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.roomId, roomId),
          isNull(chatMessages.deletedAt),
          cursor ? lt(chatMessages.createdAt, new Date(cursor)) : undefined,
          aiCondition,
        ),
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

    return {
      messages: data.reverse().map((m) => this.toMessageResponse(m)), // 오래된 순
      hasMore,
      nextCursor,
    };
  }

  // 읽음 처리
  async markRead(dto: MarkReadDto) {
    const { roomId, userId, messageId } = dto;

    const resolvedMessageId =
      messageId ??
      (
        await this.db
          .select({ id: chatMessages.id })
          .from(chatMessages)
          .where(and(eq(chatMessages.roomId, roomId), isNull(chatMessages.deletedAt)))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1)
      )[0]?.id;

    await this.db
      .update(chatRoomMembers)
      .set({
        ...(resolvedMessageId && { lastReadMessageId: resolvedMessageId }),
        lastReadAt: new Date(),
      })
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));

    if (resolvedMessageId) {
      await this.db
        .insert(messageReads)
        .values({ messageId: resolvedMessageId, userId })
        .onConflictDoUpdate({
          target: [messageReads.messageId, messageReads.userId],
          set: { readAt: new Date() },
        });
    }

    return { success: true };
  }

  // 안읽은 메시지 수
  async getUnreadCount(roomId: string, userId: number) {
    const [member] = await this.db
      .select()
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)))
      .limit(1);

    const where = !member || !member.lastReadAt
      ? and(eq(chatMessages.roomId, roomId), isNull(chatMessages.deletedAt))
      : and(eq(chatMessages.roomId, roomId), isNull(chatMessages.deletedAt), gt(chatMessages.createdAt, member.lastReadAt));

    const [row] = await this.db.select({ value: count() }).from(chatMessages).where(where);
    return row.value;
  }

  // 메시지 삭제 (soft delete)
  async deleteMessage(messageId: string, userId: number) {
    const [message] = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new AppException(Errors.Chat.MESSAGE_NOT_FOUND);
    }
    if (message.senderId !== userId) {
      throw new AppException(Errors.Chat.NOT_AUTHORIZED);
    }

    await this.db
      .update(chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(chatMessages.id, messageId));
  }

  /**
   * 사용자 탈퇴 시 채팅 데이터 익명화 (트랜잭션)
   */
  async anonymizeUserData(userId: number): Promise<number> {
    const DELETED_LABEL = '[탈퇴한 회원]';

    return this.db.transaction(async (tx) => {
      const members = await tx
        .update(chatRoomMembers)
        .set({ userName: DELETED_LABEL, userEmail: null })
        .where(eq(chatRoomMembers.userId, userId))
        .returning({ id: chatRoomMembers.id });
      const messages = await tx
        .update(chatMessages)
        .set({ senderName: DELETED_LABEL })
        .where(eq(chatMessages.senderId, userId))
        .returning({ id: chatMessages.id });
      return members.length + messages.length;
    });
  }

  /** ChatMessage → 외부 응답 변환 (type → messageType) */
  private toMessageResponse(msg: ChatMessageRow) {
    const { type, ...rest } = msg;
    return { ...rest, messageType: type };
  }
}

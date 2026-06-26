import { Injectable, Logger } from '@nestjs/common';
import { eq, and, isNull, isNotNull, inArray, asc, desc } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { chatRooms, chatRoomMembers, chatMessages } from '../db/schema';
import { RoomType } from '../contracts/enums';

export interface CreateRoomDto {
  name?: string;
  type: RoomType;
  bookingId?: number;
  memberIds: number[];
  memberNames: Record<number, string>;
  memberEmails?: Record<number, string>;
}

export interface AddMemberDto {
  roomId: string;
  userId: number;
  userName: string;
  userEmail?: string;
}

const BOOKING_ROOM_NAME_PREFIX = '예약';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  // 채팅방 생성
  async createRoom(dto: CreateRoomDto) {
    const { name, type, bookingId, memberIds, memberNames, memberEmails } = dto;

    // 1:1 채팅방은 기존 방이 있으면 반환 (나간 멤버 재활성화)
    if (type === 'DIRECT' && memberIds.length === 2) {
      const existingRoom = await this.findDirectRoom(memberIds[0], memberIds[1]);
      if (existingRoom) {
        const leftMembers = existingRoom.members.filter((m) => m.leftAt !== null);
        if (leftMembers.length > 0) {
          await this.db
            .update(chatRoomMembers)
            .set({ leftAt: null, joinedAt: new Date() })
            .where(and(eq(chatRoomMembers.roomId, existingRoom.id), isNotNull(chatRoomMembers.leftAt)));
          return this.getRoom(existingRoom.id);
        }
        return existingRoom;
      }
    }

    // 새 채팅방 생성 (nested create → 트랜잭션 내 분리 insert)
    const room = await this.db.transaction(async (tx) => {
      const [created] = await tx.insert(chatRooms).values({ name, type, bookingId }).returning();
      const members = await tx
        .insert(chatRoomMembers)
        .values(
          memberIds.map((userId, index) => ({
            roomId: created.id,
            userId,
            userName: memberNames[userId] || `User${userId}`,
            userEmail: memberEmails?.[userId] || null,
            isAdmin: index === 0, // 첫 번째 멤버가 관리자
          })),
        )
        .returning();
      return { ...created, members };
    });

    this.logger.log(`Created room: ${room.id} (${type})`);
    return room;
  }

  // 1:1 채팅방 찾기 (양쪽 userId가 모두 멤버인 DIRECT 방)
  async findDirectRoom(userId1: number, userId2: number) {
    const sub1 = this.db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, userId1));
    const sub2 = this.db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, userId2));

    const room = await this.db.query.chatRooms.findFirst({
      where: and(eq(chatRooms.type, 'DIRECT'), inArray(chatRooms.id, sub1), inArray(chatRooms.id, sub2)),
      with: { members: true },
    });
    return room ?? null;
  }

  // 멤버십 확인
  async checkMembership(roomId: string, userId: number) {
    const [member] = await this.db
      .select()
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId), isNull(chatRoomMembers.leftAt)))
      .limit(1);
    return member ?? null;
  }

  // 채팅방 조회
  async getRoom(roomId: string) {
    const room = await this.db.query.chatRooms.findFirst({
      where: eq(chatRooms.id, roomId),
      with: { members: { where: isNull(chatRoomMembers.leftAt) } },
    });
    return room ?? null;
  }

  // 사용자의 채팅방 목록
  async getUserRooms(userId: number) {
    const sub = this.db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.userId, userId), isNull(chatRoomMembers.leftAt)));

    const rooms = await this.db.query.chatRooms.findMany({
      where: inArray(chatRooms.id, sub),
      with: {
        members: { where: isNull(chatRoomMembers.leftAt) },
        messages: { orderBy: desc(chatMessages.createdAt), limit: 1 },
      },
      orderBy: desc(chatRooms.updatedAt),
    });

    return rooms.map((room) => ({
      ...room,
      lastMessage: room.messages[0] || null,
      messages: undefined,
    }));
  }

  // 멤버 추가
  async addMember(dto: AddMemberDto) {
    const { roomId, userId, userName, userEmail } = dto;

    const [existing] = await this.db
      .select()
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)))
      .limit(1);

    if (existing) {
      // 나갔던 멤버면 다시 활성화
      if (existing.leftAt) {
        const [updated] = await this.db
          .update(chatRoomMembers)
          .set({
            leftAt: null,
            joinedAt: new Date(),
            userName,
            userEmail: userEmail || existing.userEmail,
          })
          .where(eq(chatRoomMembers.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }

    const [created] = await this.db
      .insert(chatRoomMembers)
      .values({ roomId, userId, userName, userEmail: userEmail || null })
      .returning();
    return created;
  }

  // 멤버 제거 (soft delete)
  async removeMember(roomId: string, userId: number) {
    return this.db
      .update(chatRoomMembers)
      .set({ leftAt: new Date() })
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
  }

  // 채팅방 활성 멤버 목록 조회
  async getMembers(roomId: string) {
    return this.db
      .select({
        userId: chatRoomMembers.userId,
        userName: chatRoomMembers.userName,
        userEmail: chatRoomMembers.userEmail,
        isAdmin: chatRoomMembers.isAdmin,
        joinedAt: chatRoomMembers.joinedAt,
      })
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), isNull(chatRoomMembers.leftAt)))
      .orderBy(asc(chatRoomMembers.joinedAt));
  }

  // 예약 채팅방 찾기 또는 생성
  async getOrCreateBookingRoom(bookingId: number, members: { id: number; name: string }[]) {
    const existing = await this.db.query.chatRooms.findFirst({
      where: and(eq(chatRooms.bookingId, bookingId), eq(chatRooms.type, 'BOOKING')),
      with: { members: { where: isNull(chatRoomMembers.leftAt) } },
    });
    if (existing) return existing;

    const memberNames: Record<number, string> = {};
    members.forEach((m) => {
      memberNames[m.id] = m.name;
    });

    return this.createRoom({
      name: `${BOOKING_ROOM_NAME_PREFIX} #${bookingId}`,
      type: 'BOOKING',
      bookingId,
      memberIds: members.map((m) => m.id),
      memberNames,
    });
  }
}

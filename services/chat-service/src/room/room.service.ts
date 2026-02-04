import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RoomType } from '@prisma/client';

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

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(private prisma: PrismaService) {}

  // 채팅방 생성
  async createRoom(dto: CreateRoomDto) {
    const { name, type, bookingId, memberIds, memberNames, memberEmails } = dto;

    // 1:1 채팅방은 기존 방이 있으면 반환 (나간 멤버 재활성화)
    if (type === 'DIRECT' && memberIds.length === 2) {
      const existingRoom = await this.findDirectRoom(memberIds[0], memberIds[1]);
      if (existingRoom) {
        // 나갔던 멤버가 있으면 재활성화
        const leftMembers = existingRoom.members.filter((m) => m.leftAt !== null);
        if (leftMembers.length > 0) {
          await this.prisma.chatRoomMember.updateMany({
            where: {
              roomId: existingRoom.id,
              leftAt: { not: null },
            },
            data: { leftAt: null, joinedAt: new Date() },
          });
          // 갱신된 멤버 목록으로 다시 조회
          return this.prisma.chatRoom.findUnique({
            where: { id: existingRoom.id },
            include: { members: { where: { leftAt: null } } },
          });
        }
        return existingRoom;
      }
    }

    // 새 채팅방 생성
    const room = await this.prisma.chatRoom.create({
      data: {
        name,
        type,
        bookingId,
        members: {
          create: memberIds.map((userId, index) => ({
            userId,
            userName: memberNames[userId] || `User${userId}`,
            userEmail: memberEmails?.[userId] || null,
            isAdmin: index === 0, // 첫 번째 멤버가 관리자
          })),
        },
      },
      include: {
        members: true,
      },
    });

    this.logger.log(`Created room: ${room.id} (${type})`);
    return room;
  }

  // 1:1 채팅방 찾기
  async findDirectRoom(userId1: number, userId2: number) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } },
        ],
      },
      include: {
        members: true,
      },
    });

    return room;
  }

  // 멤버십 확인
  async checkMembership(roomId: string, userId: number) {
    return this.prisma.chatRoomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
  }

  // 채팅방 조회
  async getRoom(roomId: string) {
    return this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: { leftAt: null },
        },
      },
    });
  }

  // 사용자의 채팅방 목록
  async getUserRooms(userId: number) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      include: {
        members: {
          where: { leftAt: null },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
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

    // 이미 멤버인지 확인
    const existing = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing) {
      // 나갔던 멤버면 다시 활성화
      if (existing.leftAt) {
        return this.prisma.chatRoomMember.update({
          where: { id: existing.id },
          data: {
            leftAt: null,
            joinedAt: new Date(),
            userName,
            userEmail: userEmail || existing.userEmail,
          },
        });
      }
      return existing;
    }

    return this.prisma.chatRoomMember.create({
      data: { roomId, userId, userName, userEmail: userEmail || null },
    });
  }

  // 멤버 제거 (soft delete)
  async removeMember(roomId: string, userId: number) {
    return this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId },
      data: { leftAt: new Date() },
    });
  }

  // 예약 채팅방 찾기 또는 생성
  async getOrCreateBookingRoom(bookingId: number, members: { id: number; name: string }[]) {
    // 기존 방 찾기
    let room = await this.prisma.chatRoom.findFirst({
      where: { bookingId, type: 'BOOKING' },
      include: { members: { where: { leftAt: null } } },
    });

    if (!room) {
      // 새로 생성
      const memberNames: Record<number, string> = {};
      members.forEach((m) => {
        memberNames[m.id] = m.name;
      });

      room = await this.createRoom({
        name: `예약 #${bookingId}`,
        type: 'BOOKING',
        bookingId,
        memberIds: members.map((m) => m.id),
        memberNames,
      });
    }

    return room;
  }
}

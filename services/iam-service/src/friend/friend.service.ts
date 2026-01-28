import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendRequestStatus } from '@prisma/client';

@Injectable()
export class FriendService {
  private readonly logger = new Logger(FriendService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  // ==============================================
  // 친구 목록 조회
  // ==============================================
  async getFriends(userId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((f) => ({
      id: f.id,
      friendId: f.friend.id,
      friendName: f.friend.name || f.friend.email,
      friendEmail: f.friend.email,
      friendProfileImageUrl: f.friend.profileImageUrl,
      createdAt: f.createdAt,
    }));
  }

  // ==============================================
  // 친구 수 조회
  // ==============================================
  async getFriendCount(userId: number): Promise<number> {
    return this.prisma.friendship.count({
      where: { userId },
    });
  }

  // ==============================================
  // 친구 요청 목록 조회 (받은 요청)
  // ==============================================
  async getFriendRequests(userId: number) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        toUserId: userId,
        status: FriendRequestStatus.PENDING,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      fromUserId: r.fromUser.id,
      fromUserName: r.fromUser.name || r.fromUser.email,
      fromUserEmail: r.fromUser.email,
      fromUserProfileImageUrl: r.fromUser.profileImageUrl,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
    }));
  }

  // ==============================================
  // 친구 요청 목록 조회 (보낸 요청)
  // ==============================================
  async getSentFriendRequests(userId: number) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        fromUserId: userId,
        status: FriendRequestStatus.PENDING,
      },
      include: {
        toUser: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      toUserId: r.toUser.id,
      toUserName: r.toUser.name || r.toUser.email,
      toUserEmail: r.toUser.email,
      toUserProfileImageUrl: r.toUser.profileImageUrl,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
    }));
  }

  // ==============================================
  // 사용자 검색
  // ==============================================
  async searchUsers(userId: number, query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // 자기 자신 제외
          { isActive: true },
          {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
      },
      take: 20,
    });

    // 친구 관계 및 요청 상태 확인
    const friendships = await this.prisma.friendship.findMany({
      where: {
        userId,
        friendId: { in: users.map((u) => u.id) },
      },
    });

    const pendingRequests = await this.prisma.friendRequest.findMany({
      where: {
        fromUserId: userId,
        toUserId: { in: users.map((u) => u.id) },
        status: FriendRequestStatus.PENDING,
      },
    });

    const friendIds = new Set(friendships.map((f) => f.friendId));
    const pendingIds = new Set(pendingRequests.map((r) => r.toUserId));

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || u.email,
      profileImageUrl: u.profileImageUrl,
      isFriend: friendIds.has(u.id),
      hasPendingRequest: pendingIds.has(u.id),
    }));
  }

  // ==============================================
  // 친구 요청 보내기
  // ==============================================
  async sendFriendRequest(fromUserId: number, toUserId: number, message?: string) {
    // 자기 자신에게 요청 방지
    if (fromUserId === toUserId) {
      throw new Error('자기 자신에게 친구 요청을 보낼 수 없습니다.');
    }

    // 이미 친구인지 확인
    const existingFriendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: { userId: fromUserId, friendId: toUserId },
      },
    });

    if (existingFriendship) {
      throw new Error('이미 친구입니다.');
    }

    // 기존 요청 확인
    const existingRequest = await this.prisma.friendRequest.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId, toUserId },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        throw new Error('이미 친구 요청을 보냈습니다.');
      }
      // REJECTED인 경우 다시 요청 가능 - 기존 요청 업데이트
      return this.prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: FriendRequestStatus.PENDING,
          message,
          updatedAt: new Date(),
        },
      });
    }

    // 상대방이 먼저 요청한 경우 자동 수락
    const reverseRequest = await this.prisma.friendRequest.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId },
      },
    });

    if (reverseRequest && reverseRequest.status === FriendRequestStatus.PENDING) {
      return this.acceptFriendRequest(reverseRequest.id, fromUserId);
    }

    // 새 요청 생성
    const request = await this.prisma.friendRequest.create({
      data: {
        fromUserId,
        toUserId,
        message,
      },
    });

    // 요청자 정보 조회 후 알림 이벤트 발행
    const fromUser = await this.prisma.user.findUnique({
      where: { id: fromUserId },
      select: { name: true, email: true },
    });

    this.notificationClient.emit('friend.request', {
      requestId: request.id,
      fromUserId,
      toUserId,
      fromUserName: fromUser?.name || fromUser?.email || 'Unknown',
      message,
      createdAt: new Date().toISOString(),
    });

    this.logger.log(`Friend request sent: ${fromUserId} -> ${toUserId}`);
    return request;
  }

  // ==============================================
  // 친구 요청 수락
  // ==============================================
  async acceptFriendRequest(requestId: number, userId: number) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('친구 요청을 찾을 수 없습니다.');
    }

    if (request.toUserId !== userId) {
      throw new Error('이 요청을 수락할 권한이 없습니다.');
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new Error('이미 처리된 요청입니다.');
    }

    // 트랜잭션으로 친구 관계 생성 및 요청 상태 업데이트
    await this.prisma.$transaction([
      // 요청 상태 업데이트
      this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: FriendRequestStatus.ACCEPTED },
      }),
      // 양방향 친구 관계 생성
      this.prisma.friendship.create({
        data: {
          userId: request.fromUserId,
          friendId: request.toUserId,
        },
      }),
      this.prisma.friendship.create({
        data: {
          userId: request.toUserId,
          friendId: request.fromUserId,
        },
      }),
    ]);

    // 사용자 정보 조회 후 알림 이벤트 발행
    const [fromUser, toUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: request.fromUserId },
        select: { name: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: request.toUserId },
        select: { name: true, email: true },
      }),
    ]);

    this.notificationClient.emit('friend.accepted', {
      requestId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      fromUserName: fromUser?.name || fromUser?.email || 'Unknown',
      toUserName: toUser?.name || toUser?.email || 'Unknown',
      acceptedAt: new Date().toISOString(),
    });

    this.logger.log(`Friend request accepted: ${request.fromUserId} <-> ${request.toUserId}`);
    return { success: true };
  }

  // ==============================================
  // 친구 요청 거절
  // ==============================================
  async rejectFriendRequest(requestId: number, userId: number) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('친구 요청을 찾을 수 없습니다.');
    }

    if (request.toUserId !== userId) {
      throw new Error('이 요청을 거절할 권한이 없습니다.');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendRequestStatus.REJECTED },
    });

    this.logger.log(`Friend request rejected: ${requestId}`);
    return { success: true };
  }

  // ==============================================
  // 친구 삭제
  // ==============================================
  async removeFriend(userId: number, friendId: number) {
    // 양방향 친구 관계 삭제
    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
        },
      }),
    ]);

    this.logger.log(`Friendship removed: ${userId} <-> ${friendId}`);
    return { success: true };
  }

  // ==============================================
  // 친구 여부 확인
  // ==============================================
  async isFriend(userId: number, friendId: number): Promise<boolean> {
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });
    return !!friendship;
  }

  // ==============================================
  // 연락처 전화번호로 사용자 검색
  // ==============================================
  async findByPhoneNumbers(userId: number, phoneNumbers: string[]) {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return [];
    }

    // 전화번호 정규화 (하이픈, 공백 제거)
    const normalizedPhones = phoneNumbers.map((p) => p.replace(/[-\s]/g, ''));

    // phone 필드로 사용자 검색
    const users = await this.prisma.user.findMany({
      where: {
        phone: { in: normalizedPhones },
        id: { not: userId },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImageUrl: true,
      },
    });

    if (users.length === 0) {
      return [];
    }

    // 친구 관계 및 요청 상태 확인
    const friendships = await this.prisma.friendship.findMany({
      where: {
        userId,
        friendId: { in: users.map((u) => u.id) },
      },
    });

    const pendingRequests = await this.prisma.friendRequest.findMany({
      where: {
        fromUserId: userId,
        toUserId: { in: users.map((u) => u.id) },
        status: FriendRequestStatus.PENDING,
      },
    });

    const friendIds = new Set(friendships.map((f) => f.friendId));
    const pendingIds = new Set(pendingRequests.map((r) => r.toUserId));

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || u.email,
      profileImageUrl: u.profileImageUrl,
      isFriend: friendIds.has(u.id),
      hasPendingRequest: pendingIds.has(u.id),
    }));
  }
}

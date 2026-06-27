import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { and, count, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { friendRequests, friendships, users } from '../db/schema';
import { FriendRequestStatus } from '../contracts/enums';
import { AppException } from '../common/exceptions/app.exception';
import { Errors } from '../common/exceptions/catalog/error-catalog';

@Injectable()
export class FriendService {
  private readonly logger = new Logger(FriendService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  // ==============================================
  // 친구 목록 조회
  // ==============================================
  async getFriends(userId: number) {
    const friendshipList = await this.db.query.friendships.findMany({
      where: eq(friendships.userId, userId),
      with: {
        friend: {
          columns: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
    });

    return friendshipList.map((f) => ({
      id: f.id,
      friendId: f.friend.id,
      friendName: f.friend.name,
      friendEmail: f.friend.email,
      friendProfileImageUrl: f.friend.profileImageUrl,
      createdAt: f.createdAt,
    }));
  }

  // ==============================================
  // 친구 수 조회
  // ==============================================
  async getFriendCount(userId: number): Promise<number> {
    const [r] = await this.db
      .select({ value: count() })
      .from(friendships)
      .where(eq(friendships.userId, userId));
    return r.value;
  }

  // ==============================================
  // 친구 요청 목록 조회 (받은 요청)
  // ==============================================
  async getFriendRequests(userId: number) {
    const requests = await this.db.query.friendRequests.findMany({
      where: and(
        eq(friendRequests.toUserId, userId),
        eq(friendRequests.status, FriendRequestStatus.PENDING),
      ),
      with: {
        fromUser: {
          columns: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    return requests.map((r) => ({
      id: r.id,
      fromUserId: r.fromUser.id,
      fromUserName: r.fromUser.name,
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
    const requests = await this.db.query.friendRequests.findMany({
      where: and(
        eq(friendRequests.fromUserId, userId),
        eq(friendRequests.status, FriendRequestStatus.PENDING),
      ),
      with: {
        toUser: {
          columns: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    return requests.map((r) => ({
      id: r.id,
      toUserId: r.toUser.id,
      toUserName: r.toUser.name,
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

    const userList = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(
        and(
          ne(users.id, userId), // 자기 자신 제외
          eq(users.isActive, true),
          or(ilike(users.email, `%${query}%`), ilike(users.name, `%${query}%`)),
        ),
      )
      .limit(20);

    // 친구 관계 및 요청 상태 확인
    const friendshipList = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          inArray(
            friendships.friendId,
            userList.map((u) => u.id),
          ),
        ),
      );

    const pendingRequests = await this.db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, userId),
          inArray(
            friendRequests.toUserId,
            userList.map((u) => u.id),
          ),
          eq(friendRequests.status, FriendRequestStatus.PENDING),
        ),
      );

    const friendIds = new Set(friendshipList.map((f) => f.friendId));
    const pendingIds = new Set(pendingRequests.map((r) => r.toUserId));

    return userList.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
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
      throw new AppException(Errors.Friend.SELF_REQUEST);
    }

    // 이미 친구인지 확인
    const [existingFriendship] = await this.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.userId, fromUserId), eq(friendships.friendId, toUserId)))
      .limit(1);

    if (existingFriendship) {
      throw new AppException(Errors.Friend.ALREADY_FRIEND);
    }

    // 기존 요청 확인
    const [existingRequest] = await this.db
      .select()
      .from(friendRequests)
      .where(and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId)))
      .limit(1);

    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        throw new AppException(Errors.Friend.ALREADY_REQUESTED);
      }
      // REJECTED인 경우 다시 요청 가능 - 기존 요청 업데이트
      const [updated] = await this.db
        .update(friendRequests)
        .set({
          status: FriendRequestStatus.PENDING,
          message,
          updatedAt: new Date(),
        })
        .where(eq(friendRequests.id, existingRequest.id))
        .returning();
      return updated;
    }

    // 상대방이 먼저 요청한 경우 자동 수락
    const [reverseRequest] = await this.db
      .select()
      .from(friendRequests)
      .where(and(eq(friendRequests.fromUserId, toUserId), eq(friendRequests.toUserId, fromUserId)))
      .limit(1);

    if (reverseRequest && reverseRequest.status === FriendRequestStatus.PENDING) {
      return this.acceptFriendRequest(reverseRequest.id, fromUserId);
    }

    // 새 요청 생성
    const [request] = await this.db
      .insert(friendRequests)
      .values({
        fromUserId,
        toUserId,
        message,
      })
      .returning();

    // 요청자 정보 조회 후 알림 이벤트 발행
    const [fromUser] = await this.db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, fromUserId))
      .limit(1);

    this.notificationClient.emit('friend.request', {
      requestId: request.id,
      fromUserId,
      toUserId,
      fromUserName: fromUser?.name,
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
    const [request] = await this.db
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new AppException(Errors.Friend.REQUEST_NOT_FOUND);
    }

    if (request.toUserId !== userId) {
      throw new AppException(Errors.Friend.NO_PERMISSION, '이 요청을 수락할 권한이 없습니다');
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new AppException(Errors.Friend.ALREADY_PROCESSED);
    }

    // 트랜잭션으로 친구 관계 생성 및 요청 상태 업데이트
    await this.db.transaction(async (tx) => {
      // 요청 상태 업데이트
      await tx
        .update(friendRequests)
        .set({ status: FriendRequestStatus.ACCEPTED })
        .where(eq(friendRequests.id, requestId));
      // 양방향 친구 관계 생성
      await tx.insert(friendships).values({
        userId: request.fromUserId,
        friendId: request.toUserId,
      });
      await tx.insert(friendships).values({
        userId: request.toUserId,
        friendId: request.fromUserId,
      });
    });

    // 사용자 정보 조회 후 알림 이벤트 발행
    const [[fromUser], [toUser]] = await Promise.all([
      this.db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, request.fromUserId))
        .limit(1),
      this.db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, request.toUserId))
        .limit(1),
    ]);

    this.notificationClient.emit('friend.accepted', {
      requestId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      fromUserName: fromUser?.name,
      toUserName: toUser?.name,
      acceptedAt: new Date().toISOString(),
    });

    // 수신자의 FRIEND_REQUEST 알림 자동 해제
    this.notificationClient.emit('notification.dismiss', {
      userId: String(request.toUserId),
      type: 'FRIEND_REQUEST',
      dataFilter: { requestId },
    });

    this.logger.log(`Friend request accepted: ${request.fromUserId} <-> ${request.toUserId}`);
    return { success: true };
  }

  // ==============================================
  // 친구 요청 거절
  // ==============================================
  async rejectFriendRequest(requestId: number, userId: number) {
    const [request] = await this.db
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new AppException(Errors.Friend.REQUEST_NOT_FOUND);
    }

    if (request.toUserId !== userId) {
      throw new AppException(Errors.Friend.NO_PERMISSION, '이 요청을 거절할 권한이 없습니다');
    }

    await this.db
      .update(friendRequests)
      .set({ status: FriendRequestStatus.REJECTED })
      .where(eq(friendRequests.id, requestId));

    // 수신자의 FRIEND_REQUEST 알림 자동 해제
    this.notificationClient.emit('notification.dismiss', {
      userId: String(request.toUserId),
      type: 'FRIEND_REQUEST',
      dataFilter: { requestId },
    });

    this.logger.log(`Friend request rejected: ${requestId}`);
    return { success: true };
  }

  // ==============================================
  // 친구 삭제
  // ==============================================
  async removeFriend(userId: number, friendId: number) {
    // 양방향 친구 관계 삭제
    await this.db.transaction(async (tx) => {
      await tx
        .delete(friendships)
        .where(
          or(
            and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
            and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)),
          ),
        );
    });

    this.logger.log(`Friendship removed: ${userId} <-> ${friendId}`);
    return { success: true };
  }

  // ==============================================
  // 친구 여부 확인
  // ==============================================
  async isFriend(userId: number, friendId: number): Promise<boolean> {
    const [friendship] = await this.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)))
      .limit(1);
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
    const userList = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(
        and(
          inArray(users.phone, normalizedPhones),
          ne(users.id, userId),
          eq(users.isActive, true),
        ),
      );

    if (userList.length === 0) {
      return [];
    }

    // 친구 관계 및 요청 상태 확인
    const friendshipList = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          inArray(
            friendships.friendId,
            userList.map((u) => u.id),
          ),
        ),
      );

    const pendingRequests = await this.db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, userId),
          inArray(
            friendRequests.toUserId,
            userList.map((u) => u.id),
          ),
          eq(friendRequests.status, FriendRequestStatus.PENDING),
        ),
      );

    const friendIds = new Set(friendshipList.map((f) => f.friendId));
    const pendingIds = new Set(pendingRequests.map((r) => r.toUserId));

    return userList.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      profileImageUrl: u.profileImageUrl,
      isFriend: friendIds.has(u.id),
      hasPendingRequest: pendingIds.has(u.id),
    }));
  }
}

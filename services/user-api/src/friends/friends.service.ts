import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

export interface FriendDto {
  id: number;
  friendId: number;
  friendName: string;
  friendEmail: string;
  friendProfileImageUrl?: string;
  createdAt: Date;
}

export interface FriendRequestDto {
  id: number;
  fromUserId: number;
  fromUserName: string;
  fromUserEmail: string;
  fromUserProfileImageUrl?: string;
  status: string;
  message?: string;
  createdAt: Date;
}

export interface UserSearchResultDto {
  id: number;
  email: string;
  name: string;
  profileImageUrl?: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

/**
 * Friends Service for User API
 *
 * NATS Patterns:
 * - friends.list: 친구 목록 조회
 * - friends.requests: 친구 요청 목록 조회
 * - friends.search: 사용자 검색
 * - friends.request.send: 친구 요청 보내기
 * - friends.request.accept: 친구 요청 수락
 * - friends.request.reject: 친구 요청 거절
 * - friends.remove: 친구 삭제
 * - friends.check: 친구 여부 확인
 */
@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getFriends(userId: number): Promise<FriendDto[]> {
    this.logger.log(`Get friends: userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'friends.list',
      { userId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 목록을 불러오는데 실패했습니다.',
      );
    }

    return response.data;
  }

  async getFriendRequests(userId: number): Promise<FriendRequestDto[]> {
    this.logger.log(`Get friend requests: userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'friends.requests',
      { userId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 요청 목록을 불러오는데 실패했습니다.',
      );
    }

    return response.data;
  }

  async searchUsers(userId: number, query: string): Promise<UserSearchResultDto[]> {
    this.logger.log(`Search users: userId=${userId}, query=${query}`);

    const response = await this.natsClient.send<any>(
      'friends.search',
      { userId, query },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '사용자 검색에 실패했습니다.',
      );
    }

    return response.data;
  }

  async sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string,
  ): Promise<any> {
    this.logger.log(`Send friend request: ${fromUserId} -> ${toUserId}`);

    const response = await this.natsClient.send<any>(
      'friends.request.send',
      { fromUserId, toUserId, message },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 요청을 보내는데 실패했습니다.',
      );
    }

    return response.data;
  }

  async acceptFriendRequest(requestId: number, userId: number): Promise<any> {
    this.logger.log(`Accept friend request: requestId=${requestId}, userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'friends.request.accept',
      { requestId, userId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 요청 수락에 실패했습니다.',
      );
    }

    return response.data;
  }

  async rejectFriendRequest(requestId: number, userId: number): Promise<any> {
    this.logger.log(`Reject friend request: requestId=${requestId}, userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'friends.request.reject',
      { requestId, userId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 요청 거절에 실패했습니다.',
      );
    }

    return response.data;
  }

  async removeFriend(userId: number, friendId: number): Promise<any> {
    this.logger.log(`Remove friend: userId=${userId}, friendId=${friendId}`);

    const response = await this.natsClient.send<any>(
      'friends.remove',
      { userId, friendId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 삭제에 실패했습니다.',
      );
    }

    return response.data;
  }

  async isFriend(userId: number, friendId: number): Promise<{ isFriend: boolean }> {
    this.logger.log(`Check friendship: userId=${userId}, friendId=${friendId}`);

    const response = await this.natsClient.send<any>(
      'friends.check',
      { userId, friendId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '친구 여부 확인에 실패했습니다.',
      );
    }

    return response.data;
  }
}

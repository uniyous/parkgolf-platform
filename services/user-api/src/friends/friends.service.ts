import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';

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

export interface SentFriendRequestDto {
  id: number;
  toUserId: number;
  toUserName: string;
  toUserEmail: string;
  toUserProfileImageUrl?: string;
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
 * - friends.contacts.search: 연락처에서 친구 찾기
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

  async getFriends(userId: number): Promise<ApiResponse<FriendDto[]>> {
    this.logger.log(`Get friends: userId=${userId}`);
    return this.natsClient.send('friends.list', { userId }, NATS_TIMEOUTS.QUICK);
  }

  async getFriendRequests(userId: number): Promise<ApiResponse<FriendRequestDto[]>> {
    this.logger.log(`Get friend requests: userId=${userId}`);
    return this.natsClient.send('friends.requests', { userId }, NATS_TIMEOUTS.QUICK);
  }

  async getSentFriendRequests(userId: number): Promise<ApiResponse<SentFriendRequestDto[]>> {
    this.logger.log(`Get sent friend requests: userId=${userId}`);
    return this.natsClient.send('friends.requests.sent', { userId }, NATS_TIMEOUTS.QUICK);
  }

  async searchUsers(userId: number, query: string): Promise<ApiResponse<UserSearchResultDto[]>> {
    this.logger.log(`Search users: userId=${userId}, query=${query}`);
    return this.natsClient.send('friends.search', { userId, query }, NATS_TIMEOUTS.QUICK);
  }

  async findFromContacts(userId: number, phoneNumbers: string[]): Promise<ApiResponse<UserSearchResultDto[]>> {
    this.logger.log(`Find friends from contacts: userId=${userId}, phoneCount=${phoneNumbers.length}`);
    return this.natsClient.send('friends.contacts.search', { userId, phoneNumbers }, NATS_TIMEOUTS.QUICK);
  }

  async sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string,
  ): Promise<ApiResponse<any>> {
    this.logger.log(`Send friend request: ${fromUserId} -> ${toUserId}`);
    return this.natsClient.send('friends.request.send', { fromUserId, toUserId, message }, NATS_TIMEOUTS.QUICK);
  }

  async acceptFriendRequest(requestId: number, userId: number): Promise<ApiResponse<any>> {
    this.logger.log(`Accept friend request: requestId=${requestId}, userId=${userId}`);
    return this.natsClient.send('friends.request.accept', { requestId, userId }, NATS_TIMEOUTS.QUICK);
  }

  async rejectFriendRequest(requestId: number, userId: number): Promise<ApiResponse<any>> {
    this.logger.log(`Reject friend request: requestId=${requestId}, userId=${userId}`);
    return this.natsClient.send('friends.request.reject', { requestId, userId }, NATS_TIMEOUTS.QUICK);
  }

  async removeFriend(userId: number, friendId: number): Promise<ApiResponse<any>> {
    this.logger.log(`Remove friend: userId=${userId}, friendId=${friendId}`);
    return this.natsClient.send('friends.remove', { userId, friendId }, NATS_TIMEOUTS.QUICK);
  }

  async isFriend(userId: number, friendId: number): Promise<ApiResponse<{ isFriend: boolean }>> {
    this.logger.log(`Check friendship: userId=${userId}, friendId=${friendId}`);
    return this.natsClient.send('friends.check', { userId, friendId }, NATS_TIMEOUTS.QUICK);
  }
}

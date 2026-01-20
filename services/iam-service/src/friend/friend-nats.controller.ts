import { Controller, Logger, BadRequestException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FriendService } from './friend.service';
import { NatsResponse } from '../common/types/response.types';

@Controller()
export class FriendNatsController {
  private readonly logger = new Logger(FriendNatsController.name);

  constructor(private readonly friendService: FriendService) {}

  // ==============================================
  // 친구 목록 조회
  // ==============================================
  @MessagePattern('friends.list')
  async getFriends(@Payload() data: { userId: number }) {
    this.logger.debug(`Getting friends for user: ${data.userId}`);
    const friends = await this.friendService.getFriends(data.userId);
    return NatsResponse.success(friends);
  }

  // ==============================================
  // 친구 요청 목록 조회 (받은 요청)
  // ==============================================
  @MessagePattern('friends.requests')
  async getFriendRequests(@Payload() data: { userId: number }) {
    this.logger.debug(`Getting received friend requests for user: ${data.userId}`);
    const requests = await this.friendService.getFriendRequests(data.userId);
    return NatsResponse.success(requests);
  }

  // ==============================================
  // 친구 요청 목록 조회 (보낸 요청)
  // ==============================================
  @MessagePattern('friends.requests.sent')
  async getSentFriendRequests(@Payload() data: { userId: number }) {
    this.logger.debug(`Getting sent friend requests for user: ${data.userId}`);
    const requests = await this.friendService.getSentFriendRequests(data.userId);
    return NatsResponse.success(requests);
  }

  // ==============================================
  // 사용자 검색
  // ==============================================
  @MessagePattern('friends.search')
  async searchUsers(@Payload() data: { userId: number; query: string }) {
    this.logger.debug(`Searching users: ${data.query}`);
    const users = await this.friendService.searchUsers(data.userId, data.query);
    return NatsResponse.success(users);
  }

  // ==============================================
  // 친구 요청 보내기
  // ==============================================
  @MessagePattern('friends.request.send')
  async sendFriendRequest(
    @Payload() data: { fromUserId: number; toUserId: number; message?: string },
  ) {
    this.logger.debug(`Sending friend request: ${data.fromUserId} -> ${data.toUserId}`);
    try {
      const result = await this.friendService.sendFriendRequest(
        data.fromUserId,
        data.toUserId,
        data.message,
      );
      return NatsResponse.success(result);
    } catch (error) {
      this.logger.error(`Failed to send friend request: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  // ==============================================
  // 친구 요청 수락
  // ==============================================
  @MessagePattern('friends.request.accept')
  async acceptFriendRequest(@Payload() data: { requestId: number; userId: number }) {
    this.logger.debug(`Accepting friend request: ${data.requestId}`);
    try {
      const result = await this.friendService.acceptFriendRequest(data.requestId, data.userId);
      return NatsResponse.success(result);
    } catch (error) {
      this.logger.error(`Failed to accept friend request: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  // ==============================================
  // 친구 요청 거절
  // ==============================================
  @MessagePattern('friends.request.reject')
  async rejectFriendRequest(@Payload() data: { requestId: number; userId: number }) {
    this.logger.debug(`Rejecting friend request: ${data.requestId}`);
    try {
      const result = await this.friendService.rejectFriendRequest(data.requestId, data.userId);
      return NatsResponse.success(result);
    } catch (error) {
      this.logger.error(`Failed to reject friend request: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  // ==============================================
  // 친구 삭제
  // ==============================================
  @MessagePattern('friends.remove')
  async removeFriend(@Payload() data: { userId: number; friendId: number }) {
    this.logger.debug(`Removing friend: ${data.userId} <-> ${data.friendId}`);
    const result = await this.friendService.removeFriend(data.userId, data.friendId);
    return NatsResponse.success(result);
  }

  // ==============================================
  // 친구 여부 확인
  // ==============================================
  @MessagePattern('friends.check')
  async isFriend(@Payload() data: { userId: number; friendId: number }) {
    const isFriend = await this.friendService.isFriend(data.userId, data.friendId);
    return NatsResponse.success({ isFriend });
  }

  // ==============================================
  // 연락처에서 친구 찾기
  // ==============================================
  @MessagePattern('friends.contacts.search')
  async findByContacts(@Payload() data: { userId: number; phoneNumbers: string[] }) {
    this.logger.debug(`Finding friends from contacts for user: ${data.userId}`);
    const users = await this.friendService.findByPhoneNumbers(data.userId, data.phoneNumbers);
    return NatsResponse.success(users);
  }
}

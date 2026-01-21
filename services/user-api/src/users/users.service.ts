import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

export interface UserProfileDto {
  id: number;
  email: string;
  name: string;
  phoneNumber: string;
  birthDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserStatsDto {
  totalBookings: number;
  friendCount: number;
  achievementCount: number;
}

/**
 * Users Service for User API
 *
 * NATS Patterns:
 * - User CRUD: iam.users.getById, iam.users.update
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getProfile(userId: number): Promise<UserProfileDto> {
    this.logger.log(`Get profile: userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'iam.users.getById',
      { userId: String(userId) },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new NotFoundException(
        response.error?.message || '사용자를 찾을 수 없습니다.',
      );
    }

    const userData = response.data;

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name || userData.email,
      phoneNumber: userData.phoneNumber || '',
      birthDate: userData.birthDate,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };
  }

  async updateProfile(userId: number, updateData: any): Promise<UserProfileDto> {
    this.logger.log(`Update profile: userId=${userId}`);

    const response = await this.natsClient.send<any>('iam.users.update', {
      userId: String(userId),
      updateData,
    });

    if (!response.success) {
      throw new NotFoundException(
        response.error?.message || '프로필 업데이트에 실패했습니다.',
      );
    }

    const userData = response.data;

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name || userData.email,
      phoneNumber: userData.phoneNumber || '',
      birthDate: userData.birthDate,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };
  }

  async getStats(userId: number): Promise<UserStatsDto> {
    this.logger.log(`Get user stats: userId=${userId}`);

    // 병렬로 친구 수와 예약 수 조회
    const [friendsResponse, bookingsResponse] = await Promise.all([
      this.natsClient.send<any>('friends.count', { userId }, NATS_TIMEOUTS.QUICK),
      this.natsClient.send<any>('booking.userStats', { userId }, NATS_TIMEOUTS.QUICK),
    ]);

    return {
      friendCount: friendsResponse.success ? friendsResponse.data?.count ?? 0 : 0,
      totalBookings: bookingsResponse.success ? bookingsResponse.data?.totalBookings ?? 0 : 0,
      achievementCount: 0, // 추후 구현
    };
  }
}

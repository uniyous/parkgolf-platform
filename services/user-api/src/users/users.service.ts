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

/**
 * Users Service for User API
 *
 * NATS Patterns:
 * - User CRUD: users.getById, users.update
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getProfile(userId: number): Promise<UserProfileDto> {
    this.logger.log(`Get profile: userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'users.getById',
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

    const response = await this.natsClient.send<any>('users.update', {
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
}

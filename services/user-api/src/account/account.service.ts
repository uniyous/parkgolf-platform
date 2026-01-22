import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
  PasswordExpiryResponseDto,
} from './dto/change-password.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  /**
   * 비밀번호 변경
   */
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    this.logger.log(`Change password request: userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'iam.users.changePassword',
      {
        userId,
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
        confirmPassword: dto.confirmPassword,
      },
      NATS_TIMEOUTS.DEFAULT,
    );

    if (!response.success) {
      const errorMessage = response.error?.message || '비밀번호 변경에 실패했습니다.';

      // 에러 타입에 따른 예외 처리
      if (errorMessage.includes('현재 비밀번호가 올바르지 않습니다')) {
        throw new UnauthorizedException(errorMessage);
      }
      throw new BadRequestException(errorMessage);
    }

    return {
      message: response.data.message,
      passwordChangedAt: new Date(response.data.passwordChangedAt),
    };
  }

  /**
   * 비밀번호 만료 여부 확인
   */
  async checkPasswordExpiry(userId: number): Promise<PasswordExpiryResponseDto> {
    this.logger.log(`Check password expiry: userId=${userId}`);

    const response = await this.natsClient.send<any>(
      'iam.users.checkPasswordExpiry',
      { userId },
      NATS_TIMEOUTS.QUICK,
    );

    if (!response.success) {
      throw new BadRequestException(
        response.error?.message || '비밀번호 만료 확인에 실패했습니다.',
      );
    }

    return {
      needsChange: response.data.needsChange,
      daysSinceChange: response.data.daysSinceChange,
      passwordChangedAt: response.data.passwordChangedAt
        ? new Date(response.data.passwordChangedAt)
        : null,
    };
  }
}

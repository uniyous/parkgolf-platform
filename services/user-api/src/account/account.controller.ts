import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
  PasswordExpiryResponseDto,
} from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NatsResponse } from '../common/types/nats-response.type';
import { CurrentUser } from '../common/decorators';

@ApiTags('Account')
@Controller('api/user/account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('change-password')
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({
    status: 200,
    description: '비밀번호 변경 성공',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 (비밀번호 불일치 등)' })
  @ApiResponse({ status: 401, description: '현재 비밀번호 불일치 또는 인증 실패' })
  async changePassword(
    @CurrentUser('userId') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.accountService.changePassword(userId, dto);
    return NatsResponse.success(result);
  }

  @Get('password-expiry')
  @ApiOperation({ summary: '비밀번호 만료 여부 확인' })
  @ApiResponse({
    status: 200,
    description: '비밀번호 만료 정보 조회 성공',
    type: PasswordExpiryResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async checkPasswordExpiry(@CurrentUser('userId') userId: number) {
    const result = await this.accountService.checkPasswordExpiry(userId);
    return NatsResponse.success(result);
  }
}

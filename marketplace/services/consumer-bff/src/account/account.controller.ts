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
import { RequestDeletionDto } from './dto/account-deletion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    return this.accountService.changePassword(userId, dto);
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
    return this.accountService.checkPasswordExpiry(userId);
  }

  @Post('delete-request')
  @ApiOperation({ summary: '계정 삭제 요청 (7일 유예 기간)' })
  @ApiResponse({ status: 200, description: '삭제 요청 성공' })
  @ApiResponse({ status: 401, description: '비밀번호 불일치' })
  @ApiResponse({ status: 409, description: '진행 중인 예약/결제 존재' })
  async requestDeletion(
    @CurrentUser('userId') userId: number,
    @Body() dto: RequestDeletionDto,
  ) {
    return this.accountService.requestDeletion(userId, dto);
  }

  @Post('delete-cancel')
  @ApiOperation({ summary: '계정 삭제 취소' })
  @ApiResponse({ status: 200, description: '삭제 취소 성공' })
  @ApiResponse({ status: 400, description: '삭제 요청이 없음' })
  async cancelDeletion(@CurrentUser('userId') userId: number) {
    return this.accountService.cancelDeletion(userId);
  }

  @Get('delete-status')
  @ApiOperation({ summary: '계정 삭제 상태 조회' })
  @ApiResponse({ status: 200, description: '삭제 상태 조회 성공' })
  async getDeletionStatus(@CurrentUser('userId') userId: number) {
    return this.accountService.getDeletionStatus(userId);
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationSettingsDto {
  @ApiProperty({ description: '예약 알림', example: true })
  @IsBoolean()
  booking: boolean;

  @ApiProperty({ description: '채팅 알림', example: true })
  @IsBoolean()
  chat: boolean;

  @ApiProperty({ description: '친구 알림', example: true })
  @IsBoolean()
  friend: boolean;

  @ApiProperty({ description: '마케팅 알림', example: false })
  @IsBoolean()
  marketing: boolean;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: '예약 알림', example: true })
  @IsOptional()
  @IsBoolean()
  booking?: boolean;

  @ApiPropertyOptional({ description: '채팅 알림', example: true })
  @IsOptional()
  @IsBoolean()
  chat?: boolean;

  @ApiPropertyOptional({ description: '친구 알림', example: true })
  @IsOptional()
  @IsBoolean()
  friend?: boolean;

  @ApiPropertyOptional({ description: '마케팅 알림', example: false })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

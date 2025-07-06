import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString, IsNumber, IsBoolean } from 'class-validator';
import { NotificationType, NotificationStatus } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ description: '사용자 ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '알림 유형', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '알림 메시지' })
  @IsString()
  message: string;

  @ApiProperty({ description: '추가 데이터', required: false })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: '발송 채널', required: false })
  @IsOptional()
  @IsString()
  deliveryChannel?: string;

  @ApiProperty({ description: '예약 발송 시간', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateNotificationDto {
  @ApiProperty({ description: '알림 상태', enum: NotificationStatus, required: false })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiProperty({ description: '읽음 시간', required: false })
  @IsOptional()
  @IsDateString()
  readAt?: string;
}

export class NotificationQueryDto {
  @ApiProperty({ description: '페이지 번호', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: '페이지 크기', required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiProperty({ description: '알림 유형', enum: NotificationType, required: false })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ description: '알림 상태', enum: NotificationStatus, required: false })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiProperty({ description: '읽지 않은 알림만', required: false })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty({ description: '이메일 알림 허용' })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ description: 'SMS 알림 허용' })
  @IsBoolean()
  sms: boolean;

  @ApiProperty({ description: '푸시 알림 허용' })
  @IsBoolean()
  push: boolean;

  @ApiProperty({ description: '마케팅 알림 허용' })
  @IsBoolean()
  marketing: boolean;
}

export class SendNotificationDto {
  @ApiProperty({ description: '사용자 ID들' })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ description: '알림 유형', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '알림 메시지' })
  @IsString()
  message: string;

  @ApiProperty({ description: '추가 데이터', required: false })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: '발송 채널', required: false })
  @IsOptional()
  @IsString()
  deliveryChannel?: string;

  @ApiProperty({ description: '예약 발송 시간', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
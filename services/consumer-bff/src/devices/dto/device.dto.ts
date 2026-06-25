import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum DevicePlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export class RegisterDeviceDto {
  @ApiProperty({
    description: '디바이스 플랫폼',
    enum: DevicePlatform,
    example: DevicePlatform.IOS,
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiProperty({
    description: '푸시 알림 토큰 (FCM/APNs/Web Push)',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  deviceToken: string;

  @ApiPropertyOptional({
    description: '디바이스 고유 ID',
    example: 'device-uuid-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: '디바이스 이름',
    example: 'iPhone 15 Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class DeviceResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: DevicePlatform })
  platform: DevicePlatform;

  @ApiPropertyOptional()
  deviceId?: string;

  @ApiPropertyOptional()
  deviceName?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastActiveAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

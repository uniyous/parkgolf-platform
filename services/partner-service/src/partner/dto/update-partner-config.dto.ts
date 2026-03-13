import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';

enum SyncMode {
  API_POLLING = 'API_POLLING',
  WEBHOOK = 'WEBHOOK',
  HYBRID = 'HYBRID',
  MANUAL = 'MANUAL',
}

export class UpdatePartnerConfigDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsOptional()
  systemName?: string;

  @IsString()
  @IsOptional()
  externalClubId?: string;

  @IsString()
  @IsOptional()
  specUrl?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  apiSecret?: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsObject()
  @IsOptional()
  responseMapping?: Record<string, unknown>;

  @IsEnum(SyncMode)
  @IsOptional()
  syncMode?: SyncMode;

  @IsNumber()
  @Min(1)
  @Max(60)
  @IsOptional()
  syncIntervalMin?: number;

  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  syncRangeDays?: number;

  @IsBoolean()
  @IsOptional()
  slotSyncEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  bookingSyncEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

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

export class CreatePartnerConfigDto {
  @IsNumber()
  clubId: number;

  @IsNumber()
  companyId: number;

  @IsString()
  systemName: string;

  @IsString()
  externalClubId: string;

  @IsString()
  specUrl: string;

  @IsString()
  apiKey: string;

  @IsString()
  @IsOptional()
  apiSecret?: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsObject()
  responseMapping: Record<string, unknown>;

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
}

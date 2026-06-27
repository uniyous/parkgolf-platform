import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateGameTimeSlotDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)', example: '2025-01-15' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:MM)', example: '12:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty({ description: '가격', example: 50000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({ description: '최대 플레이어 수', default: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @ApiPropertyOptional({ description: '프리미엄 타임슬롯 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ description: '상태', default: 'AVAILABLE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateGameTimeSlotDto {
  @ApiPropertyOptional({ description: '날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: '시작 시간 (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime?: string;

  @ApiPropertyOptional({ description: '종료 시간 (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime?: string;

  @ApiPropertyOptional({ description: '가격' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: '최대 플레이어 수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @ApiPropertyOptional({ description: '프리미엄 타임슬롯 여부' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class GameTimeSlotFilterDto {
  @ApiPropertyOptional({ description: '게임 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gameId?: number;

  @ApiPropertyOptional({ description: '클럽 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clubId?: number;

  @ApiPropertyOptional({ description: '시작 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: '종료 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '페이지 번호' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class BulkCreateGameTimeSlotDto {
  @ApiProperty({ description: '타임슬롯 배열', type: [CreateGameTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGameTimeSlotDto)
  timeSlots: CreateGameTimeSlotDto[];
}

export class GenerateTimeSlotsDto {
  @ApiProperty({ description: '시작 날짜 (YYYY-MM-DD)', example: '2025-01-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: '종료 날짜 (YYYY-MM-DD)', example: '2025-01-31' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

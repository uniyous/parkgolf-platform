import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGameDto {
  @ApiProperty({ description: '게임명 (예: A+B 코스)', example: 'A+B 코스' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '게임 코드', example: 'AB' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '전반 9홀 코스 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  frontNineCourseId: number;

  @ApiProperty({ description: '후반 9홀 코스 ID', example: 2 })
  @IsNumber()
  @IsNotEmpty()
  backNineCourseId: number;

  @ApiPropertyOptional({ description: '총 홀 수', default: 18 })
  @IsOptional()
  @IsNumber()
  totalHoles?: number;

  @ApiPropertyOptional({ description: '예상 플레이 시간 (분)', default: 180 })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: '휴식 시간 (분)', default: 10 })
  @IsOptional()
  @IsNumber()
  breakDuration?: number;

  @ApiPropertyOptional({ description: '최대 플레이어 수', default: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @ApiProperty({ description: '기본 가격', example: 30000 })
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiPropertyOptional({ description: '주말 가격' })
  @IsOptional()
  @IsNumber()
  weekendPrice?: number;

  @ApiPropertyOptional({ description: '공휴일 가격' })
  @IsOptional()
  @IsNumber()
  holidayPrice?: number;

  @ApiProperty({ description: '클럽 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  clubId: number;
}

export class UpdateGameDto {
  @ApiPropertyOptional({ description: '게임명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '게임 코드' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '전반 9홀 코스 ID' })
  @IsOptional()
  @IsNumber()
  frontNineCourseId?: number;

  @ApiPropertyOptional({ description: '후반 9홀 코스 ID' })
  @IsOptional()
  @IsNumber()
  backNineCourseId?: number;

  @ApiPropertyOptional({ description: '예상 플레이 시간 (분)' })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: '휴식 시간 (분)' })
  @IsOptional()
  @IsNumber()
  breakDuration?: number;

  @ApiPropertyOptional({ description: '최대 플레이어 수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @ApiPropertyOptional({ description: '기본 가격' })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '주말 가격' })
  @IsOptional()
  @IsNumber()
  weekendPrice?: number;

  @ApiPropertyOptional({ description: '공휴일 가격' })
  @IsOptional()
  @IsNumber()
  holidayPrice?: number;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '상태', enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class GameFilterDto {
  @ApiPropertyOptional({ description: '클럽 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clubId?: number;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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

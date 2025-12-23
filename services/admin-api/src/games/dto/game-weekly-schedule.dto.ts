import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateGameWeeklyScheduleDto {
  @ApiProperty({ description: '게임 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  gameId: number;

  @ApiProperty({
    description: '요일 (0=일요일, 1=월요일, ..., 6=토요일)',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: '시작 시간 (HH:MM)', example: '06:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:MM)', example: '18:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiPropertyOptional({ description: '타임슬롯 간격 (분)', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  interval?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGameWeeklyScheduleDto {
  @ApiPropertyOptional({ description: '요일 (0=일요일, 1=월요일, ..., 6=토요일)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

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

  @ApiPropertyOptional({ description: '타임슬롯 간격 (분)' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  interval?: number;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGameWeeklyScheduleDto {
  @IsNumber()
  @Type(() => Number)
  gameId: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=일, 1=월, ...

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(5)
  @Max(60)
  interval?: number; // 타임 간격 (분)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGameWeeklyScheduleDto {
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(5)
  @Max(60)
  interval?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FindGameWeeklySchedulesQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  gameId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class BulkCreateGameWeeklyScheduleDto {
  @IsNumber()
  @Type(() => Number)
  gameId: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(5)
  @Max(60)
  interval?: number;

  @IsBoolean()
  @IsOptional()
  includeWeekend?: boolean; // true면 토/일 포함, false면 평일만
}

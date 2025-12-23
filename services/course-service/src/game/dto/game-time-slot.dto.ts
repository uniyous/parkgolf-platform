import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TimeSlotStatus {
  AVAILABLE = 'AVAILABLE',
  FULLY_BOOKED = 'FULLY_BOOKED',
  CLOSED = 'CLOSED',
  MAINTENANCE = 'MAINTENANCE',
}

export class CreateGameTimeSlotDto {
  @IsNumber()
  @Type(() => Number)
  gameId: number;

  @IsDateString()
  date: string;

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
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;

  @IsEnum(TimeSlotStatus)
  @IsOptional()
  status?: TimeSlotStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGameTimeSlotDto {
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
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  bookedPlayers?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;

  @IsEnum(TimeSlotStatus)
  @IsOptional()
  status?: TimeSlotStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FindGameTimeSlotsQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  gameId?: number;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsEnum(TimeSlotStatus)
  @IsOptional()
  status?: TimeSlotStatus;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  availableOnly?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GenerateTimeSlotsDto {
  @IsNumber()
  @Type(() => Number)
  gameId: number;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;
}

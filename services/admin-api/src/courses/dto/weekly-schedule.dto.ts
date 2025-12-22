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

export class CreateWeeklyScheduleDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Day of week is required' })
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time (HH:MM)',
    example: '06:00',
  })
  @IsString()
  @IsNotEmpty({ message: 'Start time is required' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time (HH:MM)',
    example: '20:00',
  })
  @IsString()
  @IsNotEmpty({ message: 'End time is required' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Time slot interval in minutes',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  intervalMinutes?: number;

  @ApiPropertyOptional({
    description: 'Default price for time slots',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @ApiPropertyOptional({
    description: 'Is schedule active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWeeklyScheduleDto {
  @ApiPropertyOptional({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Start time (HH:MM)',
    example: '06:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time (HH:MM)',
    example: '20:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Time slot interval in minutes',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  intervalMinutes?: number;

  @ApiPropertyOptional({
    description: 'Default price for time slots',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @ApiPropertyOptional({
    description: 'Is schedule active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

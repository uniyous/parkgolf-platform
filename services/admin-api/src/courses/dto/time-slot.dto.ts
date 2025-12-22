import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateTimeSlotDto {
  @ApiProperty({
    description: 'Date for the time slot (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  @ApiProperty({
    description: 'Start time (HH:MM)',
    example: '09:00',
  })
  @IsString()
  @IsNotEmpty({ message: 'Start time is required' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time (HH:MM)',
    example: '10:00',
  })
  @IsString()
  @IsNotEmpty({ message: 'End time is required' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty({
    description: 'Price for the time slot',
    example: 50000,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty({ message: 'Price is required' })
  price: number;

  @ApiPropertyOptional({
    description: 'Maximum number of players',
    example: 4,
    default: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @ApiPropertyOptional({
    description: 'Is time slot active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Play type (9-hole or 18-hole)',
    example: '18-hole',
    enum: ['9-hole', '18-hole'],
  })
  @IsOptional()
  @IsString()
  playType?: string;
}

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({
    description: 'Date for the time slot (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Start time (HH:MM)',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time (HH:MM)',
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Price for the time slot',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of players',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @ApiPropertyOptional({
    description: 'Is time slot active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TimeSlotFilterDto {
  @ApiPropertyOptional({
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter from time (HH:MM)',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  timeFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter to time (HH:MM)',
    example: '18:00',
  })
  @IsOptional()
  @IsString()
  timeTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class BulkTimeSlotDto {
  @ApiProperty({
    description: 'Array of time slots to create',
    type: [CreateTimeSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimeSlotDto)
  timeSlots: CreateTimeSlotDto[];
}

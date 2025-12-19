import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by booking status',
    example: 'CONFIRMED',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: '1',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @ApiProperty({
    description: 'Course ID',
    example: '1',
  })
  @IsString()
  @IsNotEmpty({ message: 'Course ID is required' })
  courseId: string;

  @ApiProperty({
    description: 'Time slot ID',
    example: '1',
  })
  @IsString()
  @IsNotEmpty({ message: 'Time slot ID is required' })
  timeSlotId: string;

  @ApiProperty({
    description: 'Booking date (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Booking date is required' })
  bookingDate: string;

  @ApiPropertyOptional({
    description: 'Number of players',
    example: 4,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  playerCount?: number;

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Please prepare golf cart',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'Number of players',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  playerCount?: number;

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Please prepare golf cart',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Booking status',
    example: 'CONFIRMED',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
  status?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Customer requested cancellation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Booking } from '@prisma/client';

export class CreateBookingRequestDto {
  @ApiProperty({ description: '사용자 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ description: '코스 ID', example: 1 })
  @IsNumber() 
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ description: '예약 날짜', example: '2024-07-15T09:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiProperty({ description: '시간 슬롯', example: '09:00' })
  @IsNotEmpty()
  timeSlot: string;

  @ApiProperty({ description: '플레이어 수', example: 4 })
  @IsNumber()
  playerCount: number;

  @ApiProperty({ description: '총 가격', example: 100000 })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({ description: '메모', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  courseId: number;

  @ApiProperty()
  timeSlot: string;

  @ApiProperty()
  bookingDate: Date;

  @ApiProperty()
  playerCount: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(booking: Booking): BookingResponseDto {
    return {
      id: booking.id,
      userId: booking.userId,
      courseId: booking.courseId,
      timeSlot: booking.timeSlot,
      bookingDate: booking.bookingDate,
      status: booking.status,
      playerCount: booking.playerCount,
      totalPrice: Number(booking.totalPrice),
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}

// NATS 이벤트 페이로드
export interface BookingConfirmedEvent {
  bookingId: number;
  userId: number;
  courseId: number;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  totalPrice: number;
}
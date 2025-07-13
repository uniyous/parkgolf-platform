import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingRequestDto {
  @ApiProperty({ description: '사용자 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ description: '코스 ID', example: 1 })
  @IsNumber() 
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ description: '예약 날짜', example: '2024-07-15' })
  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiProperty({ description: '시간 슬롯', example: '09:00' })
  @IsNotEmpty()
  timeSlot: string;

  @ApiProperty({ description: '플레이어 수', example: 2 })
  @IsNumber()
  playerCount: number;

  @ApiProperty({ description: '결제 방법', example: 'card' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: '특별 요청사항', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ description: '사용자 이메일', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({ description: '사용자 이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: '사용자 전화번호', example: '010-1234-5678' })
  @IsString()
  @IsOptional()
  userPhone?: string;
}

export class UpdateBookingDto {
  @ApiProperty({ description: '플레이어 수', example: 3 })
  @IsNumber()
  @IsOptional()
  playerCount?: number;

  @ApiProperty({ description: '특별 요청사항', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ description: '사용자 전화번호', example: '010-1234-5678' })
  @IsString()
  @IsOptional()
  userPhone?: string;
}

export class SearchBookingDto {
  @ApiProperty({ description: '페이지 번호', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 10, required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: '예약 상태', example: 'CONFIRMED', required: false })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiProperty({ description: '코스 ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  courseId?: number;

  @ApiProperty({ description: '사용자 ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: '시작 날짜', example: '2024-07-01', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: '종료 날짜', example: '2024-07-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class TimeSlotAvailabilityDto {
  @ApiProperty({ description: '타임슬롯 ID' })
  id: number;

  @ApiProperty({ description: '시간', example: '09:00' })
  time: string;

  @ApiProperty({ description: '날짜', example: '2024-07-15' })
  date: string;

  @ApiProperty({ description: '예약 가능 여부' })
  available: boolean;

  @ApiProperty({ description: '가격' })
  price: number;

  @ApiProperty({ description: '프리미엄 시간대 여부' })
  isPremium: boolean;

  @ApiProperty({ description: '남은 자리' })
  remaining: number;
}

export class BookingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  bookingNumber: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  courseId: number;

  @ApiProperty()
  courseName: string;

  @ApiProperty()
  courseLocation: string;

  @ApiProperty()
  timeSlot: string;

  @ApiProperty()
  bookingDate: string;

  @ApiProperty()
  playerCount: number;

  @ApiProperty()
  pricePerPerson: number;

  @ApiProperty()
  serviceFee: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  status: BookingStatus;

  @ApiProperty()
  paymentMethod?: string;

  @ApiProperty()
  specialRequests?: string;

  @ApiProperty()
  userEmail: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  userPhone?: string;

  @ApiProperty()
  payments: any[];

  @ApiProperty()
  histories: any[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// NATS 이벤트 페이로드
export interface BookingConfirmedEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  courseId: number;
  courseName: string;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  totalPrice: number;
  userEmail: string;
  userName: string;
}

export interface BookingCancelledEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  courseId: number;
  courseName: string;
  bookingDate: string;
  timeSlot: string;
  reason: string;
  cancelledAt: string;
  userEmail: string;
  userName: string;
}
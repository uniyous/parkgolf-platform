import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingRequestDto {
  @ApiProperty({ description: '사용자 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ description: 'GameTimeSlot ID (course-service)', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  gameTimeSlotId: number;

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

  @ApiProperty({ description: 'Game ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  gameId?: number;

  @ApiProperty({ description: 'Club ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  clubId?: number;

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

  @ApiProperty({ description: '정렬 기준', example: 'bookingDate', required: false })
  @IsString()
  @IsOptional()
  sortBy?: 'bookingDate' | 'createdAt' | 'totalPrice';

  @ApiProperty({ description: '정렬 순서', example: 'desc', required: false })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ description: '시간 필터', example: 'upcoming', required: false })
  @IsString()
  @IsOptional()
  timeFilter?: 'upcoming' | 'past' | 'all';
}

export class GameTimeSlotAvailabilityDto {
  @ApiProperty({ description: 'ID' })
  id: number;

  @ApiProperty({ description: 'GameTimeSlot ID' })
  gameTimeSlotId: number;

  @ApiProperty({ description: 'Game ID' })
  gameId: number;

  @ApiProperty({ description: '게임명' })
  gameName: string;

  @ApiProperty({ description: '게임 코드' })
  gameCode: string;

  @ApiProperty({ description: '전반 9홀 코스명' })
  frontNineCourseName: string;

  @ApiProperty({ description: '후반 9홀 코스명' })
  backNineCourseName: string;

  @ApiProperty({ description: '클럽 ID' })
  clubId: number;

  @ApiProperty({ description: '클럽명' })
  clubName: string;

  @ApiProperty({ description: '날짜', example: '2024-07-15' })
  date: string;

  @ApiProperty({ description: '시작 시간', example: '09:00' })
  startTime: string;

  @ApiProperty({ description: '종료 시간', example: '12:00' })
  endTime: string;

  @ApiProperty({ description: '최대 인원' })
  maxPlayers: number;

  @ApiProperty({ description: '예약된 인원' })
  bookedPlayers: number;

  @ApiProperty({ description: '가용 인원' })
  availablePlayers: number;

  @ApiProperty({ description: '예약 가능 여부' })
  isAvailable: boolean;

  @ApiProperty({ description: '가격' })
  price: number;

  @ApiProperty({ description: '프리미엄 시간대 여부' })
  isPremium: boolean;

  @ApiProperty({ description: '상태' })
  status: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  bookingNumber: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  gameId: number;

  @ApiProperty()
  gameTimeSlotId: number;

  @ApiProperty()
  gameName: string;

  @ApiProperty()
  gameCode: string;

  @ApiProperty()
  frontNineCourseId: number;

  @ApiProperty()
  frontNineCourseName: string;

  @ApiProperty()
  backNineCourseId: number;

  @ApiProperty()
  backNineCourseName: string;

  @ApiProperty()
  clubId: number;

  @ApiProperty()
  clubName: string;

  @ApiProperty()
  bookingDate: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

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
  gameId: number;
  gameName: string;
  frontNineCourseName: string;
  backNineCourseName: string;
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
  gameId: number;
  gameName: string;
  bookingDate: string;
  timeSlot: string;
  reason: string;
  cancelledAt: string;
  userEmail: string;
  userName: string;
}

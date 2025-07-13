import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: '코스 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ description: '예약 날짜', example: '2024-07-15' })
  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiProperty({ description: '시간 슬롯', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  timeSlot: string;

  @ApiProperty({ description: '플레이어 수', example: 2 })
  @IsNumber()
  @IsNotEmpty()
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
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: '코스 ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  courseId?: number;

  @ApiProperty({ description: '시작 날짜', example: '2024-07-01', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: '종료 날짜', example: '2024-07-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CancelBookingDto {
  @ApiProperty({ description: '취소 사유', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
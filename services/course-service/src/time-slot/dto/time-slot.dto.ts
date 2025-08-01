import { ApiProperty } from '@nestjs/swagger';
import { CourseTimeSlot as CourseTimeSlotModel, RoundType } from '@prisma/client';
import { IsDateString, IsInt, IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateTimeSlotsDto {
  @ApiProperty({ description: '코스 ID' })
  @IsInt()
  @IsNotEmpty()
  courseId: number;
}

export class GetAvailableTimeSlotsDto {
  // 현재 스키마에서는 날짜별 슬롯이 없으므로 빈 DTO
}

export class CourseTimeSlotResponseDto {
  @ApiProperty({ description: '시간 슬롯 ID' })
  id: number;

  @ApiProperty({ description: '날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: '슬롯 시작 시간 (HH:MM)' })
  startTime: string;

  @ApiProperty({ description: '슬롯 종료 시간 (HH:MM)' })
  endTime: string;

  @ApiProperty({ description: '라운드 타입', enum: RoundType })
  roundType: RoundType;

  @ApiProperty({ description: '첫 번째 코스 ID' })
  firstCourseId: number;

  @ApiProperty({ description: '두 번째 코스 ID', required: false })
  secondCourseId?: number;

  @ApiProperty({ description: '예약된 인원' })
  bookedCount: number;

  @ApiProperty({ description: '최대 예약 가능 인원' })
  availableSlots: number;

  @ApiProperty({ description: '9홀 가격', required: false })
  nineHolePrice?: number;

  @ApiProperty({ description: '18홀 가격' })
  eighteenHolePrice: number;

  @ApiProperty({ description: '상태' })
  status: string;

  @ApiProperty({ description: '메모', required: false })
  notes?: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  static fromEntity(entity: any): CourseTimeSlotResponseDto {
    return {
      id: entity.id,
      date: entity.date,
      startTime: entity.startTime,
      endTime: entity.endTime,
      roundType: entity.roundType,
      firstCourseId: entity.firstCourseId,
      secondCourseId: entity.secondCourseId,
      bookedCount: entity.bookedCount,
      availableSlots: entity.availableSlots,
      nineHolePrice: entity.nineHolePrice ? Number(entity.nineHolePrice) : undefined,
      eighteenHolePrice: Number(entity.eighteenHolePrice),
      status: entity.status,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class GetSlotDetailsForBookingDto {
  @ApiProperty({ description: '코스 ID' })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ description: '시간 슬롯 ID' })
  @IsString()
  @IsNotEmpty()
  slotId: string;
}

export class SlotDetailsForBookingResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  courseId: number;
  @ApiProperty({ description: '슬롯 시작 시간 (HH:MM 형식)' })
  startTime: string;
  @ApiProperty({ description: '슬롯 종료 시간 (HH:MM 형식)' })
  endTime: string;
  @ApiProperty()
  maxCapacity: number;
  @ApiProperty()
  isAvailable: boolean;
}

// ===== Admin API DTOs =====

export class CreateTimeSlotDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: '라운드 타입', enum: RoundType, default: RoundType.EIGHTEEN_HOLE })
  @IsEnum(RoundType)
  @IsOptional()
  roundType?: RoundType = RoundType.EIGHTEEN_HOLE;

  @ApiProperty({ description: '첫 번째 코스 ID' })
  @IsInt()
  @IsNotEmpty()
  firstCourseId: number;

  @ApiProperty({ description: '두 번째 코스 ID (18홀용)', required: false })
  @IsInt()
  @IsOptional()
  secondCourseId?: number;

  @ApiProperty({ description: '최대 인원' })
  @IsNumber()
  @IsNotEmpty()
  availableSlots: number;

  @ApiProperty({ description: '9홀 가격', required: false })
  @IsNumber()
  @IsOptional()
  nineHolePrice?: number;

  @ApiProperty({ description: '18홀 가격' })
  @IsNumber()
  @IsNotEmpty()
  eighteenHolePrice: number;

  @ApiProperty({ description: '메모', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTimeSlotDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiProperty({ description: '시작 시간 (HH:MM)', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: '종료 시간 (HH:MM)', required: false })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ description: '라운드 타입', enum: RoundType, required: false })
  @IsEnum(RoundType)
  @IsOptional()
  roundType?: RoundType;

  @ApiProperty({ description: '첫 번째 코스 ID', required: false })
  @IsInt()
  @IsOptional()
  firstCourseId?: number;

  @ApiProperty({ description: '두 번째 코스 ID', required: false })
  @IsInt()
  @IsOptional()
  secondCourseId?: number;

  @ApiProperty({ description: '최대 인원', required: false })
  @IsNumber()
  @IsOptional()
  availableSlots?: number;

  @ApiProperty({ description: '9홀 가격', required: false })
  @IsNumber()
  @IsOptional()
  nineHolePrice?: number;

  @ApiProperty({ description: '18홀 가격', required: false })
  @IsNumber()
  @IsOptional()
  eighteenHolePrice?: number;

  @ApiProperty({ description: '메모', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

// 필터링을 위한 DTO 추가
export class TimeSlotFilterDto {
  @ApiProperty({ description: '시작 날짜 (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiProperty({ description: '종료 날짜 (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiProperty({ description: '시작 시간 필터 (HH:MM)', required: false })
  @IsString()
  @IsOptional()
  timeFrom?: string;

  @ApiProperty({ description: '종료 시간 필터 (HH:MM)', required: false })
  @IsString()
  @IsOptional()
  timeTo?: string;

  @ApiProperty({ description: '활성 상태 필터', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '페이지 번호', required: false, default: 1 })
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '페이지 크기', required: false, default: 20 })
  @IsInt()
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ description: '정렬 기준', required: false, default: 'date' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'date';

  @ApiProperty({ description: '정렬 순서', required: false, default: 'asc' })
  @IsString()
  @IsOptional()
  sortOrder?: string = 'asc';
}

export class BulkCreateTimeSlotsDto {
  @ApiProperty({ description: '타임슬롯 목록', type: [CreateTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimeSlotDto)
  timeSlots: CreateTimeSlotDto[];
}
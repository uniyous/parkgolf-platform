import { ApiProperty } from '@nestjs/swagger';
import { CourseTimeSlot as CourseTimeSlotModel } from '@prisma/client';
import { IsDateString, IsInt, IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
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

  @ApiProperty({ description: '코스 ID' })
  courseId: number;

  @ApiProperty({ description: '날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: '슬롯 시작 시간 (HH:MM)' })
  startTime: string;

  @ApiProperty({ description: '슬롯 종료 시간 (HH:MM)' })
  endTime: string;

  @ApiProperty({ description: '슬롯당 최대 예약 가능 인원' })
  maxPlayers: number;

  @ApiProperty({ description: '가격' })
  price: number;

  @ApiProperty({ description: '활성 상태' })
  isActive: boolean;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  static fromEntity(entity: CourseTimeSlotModel): CourseTimeSlotResponseDto {
    return {
      id: entity.id,
      courseId: entity.courseId,
      date: entity.date,
      startTime: entity.startTime,
      endTime: entity.endTime,
      maxPlayers: entity.maxPlayers,
      price: Number(entity.price),
      isActive: entity.isActive,
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

  @ApiProperty({ description: '최대 인원' })
  @IsNumber()
  @IsNotEmpty()
  maxPlayers: number;

  @ApiProperty({ description: '가격' })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ description: '활성 상태', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
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

  @ApiProperty({ description: '최대 인원', required: false })
  @IsNumber()
  @IsOptional()
  maxPlayers?: number;

  @ApiProperty({ description: '가격', required: false })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ description: '활성 상태', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
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
}

export class BulkCreateTimeSlotsDto {
  @ApiProperty({ description: '타임슬롯 목록', type: [CreateTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimeSlotDto)
  timeSlots: CreateTimeSlotDto[];
}

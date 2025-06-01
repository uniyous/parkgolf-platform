import { ApiProperty } from '@nestjs/swagger';
import { CourseTimeSlot as CourseTimeSlotModel } from '@prisma/client';
import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class GenerateTimeSlotsDto {
  @ApiProperty({ description: '골프 코스 ID' })
  @IsInt()
  @IsNotEmpty()
  golfCourseId: number;

  @ApiProperty({ description: '슬롯 생성 시작 날짜 (YYYY-MM-DD)', example: '2024-07-20' })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: '슬롯 생성 종료 날짜 (YYYY-MM-DD)', example: '2024-07-27' })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;
}

export class GetAvailableTimeSlotsDto {
  // 경로 파라미터로 golfCourseId를 받으므로, 여기서는 제외하거나 선택적으로 검증
  // @ApiProperty({ description: '골프 코스 ID' })
  // @IsInt()
  // @IsNotEmpty()
  // golfCourseId: number;

  @ApiProperty({ description: '조회 날짜 (YYYY-MM-DD)', example: '2024-07-20' })
  @IsDateString()
  @IsNotEmpty()
  date: string; // 단일 날짜 조회를 기본으로, 범위 조회는 별도 파라미터나 로직으로 처리 가능
}

export class CourseTimeSlotResponseDto {
  @ApiProperty({ description: '시간 슬롯 ID' })
  id: string;

  @ApiProperty({ description: '골프 코스 ID' })
  golfCourseId: number;

  @ApiProperty({ description: '슬롯 날짜 (YYYY-MM-DDTHH:mm:ss.sssZ)' })
  date: Date;

  @ApiProperty({ description: '슬롯 시작 시간 (YYYY-MM-DDTHH:mm:ss.sssZ)' })
  startTime: Date;

  @ApiProperty({ description: '슬롯 종료 시간 (YYYY-MM-DDTHH:mm:ss.sssZ)' })
  endTime: Date;

  @ApiProperty({ description: '슬롯당 최대 예약 가능 인원' })
  maxCapacity: number;

  @ApiProperty({ description: '현재 예약된 인원 수' })
  bookedCount: number;

  @ApiProperty({ description: '현재 예약 가능 여부' })
  isAvailable: boolean;

  static fromEntity(entity: CourseTimeSlotModel): CourseTimeSlotResponseDto {
    return {
      id: entity.id,
      golfCourseId: entity.golfCourseId,
      date: entity.date,
      startTime: entity.startTime,
      endTime: entity.endTime,
      maxCapacity: entity.maxCapacity,
      bookedCount: entity.bookedCount,
      isAvailable: entity.bookedCount < entity.maxCapacity,
    };
  }
}

export class GetSlotDetailsForBookingDto {
  @ApiProperty({ description: '골프 코스 ID' })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ description: '시간 슬롯 ID' })
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty({ description: '요청 날짜 (YYYY-MM-DD), 슬롯 날짜와 검증용', example: '2024-07-20' })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}

export class SlotDetailsForBookingResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  courseId: number;
  @ApiProperty({ description: '슬롯 날짜 (YYYY-MM-DD 형식)' })
  date: string; // Booking Service가 이해하기 쉬운 형식으로 변환
  @ApiProperty({ description: '슬롯 시작 시간 (ISO 문자열)' })
  startTime: string;
  @ApiProperty({ description: '슬롯 종료 시간 (ISO 문자열)' })
  endTime: string;
  @ApiProperty()
  maxCapacity: number;
  @ApiProperty()
  isAvailable: boolean;
}

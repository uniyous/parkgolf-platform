import { ApiProperty } from '@nestjs/swagger';
import { CourseTimeSlot as CourseTimeSlotModel } from '@prisma/client';
import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';

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

  static fromEntity(entity: CourseTimeSlotModel): CourseTimeSlotResponseDto {
    return {
      id: entity.id,
      courseId: entity.courseId,
      startTime: entity.startTime,
      endTime: entity.endTime,
      maxPlayers: entity.maxPlayers,
      price: Number(entity.price),
      isActive: entity.isActive,
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

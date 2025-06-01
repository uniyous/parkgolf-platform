import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CourseWeeklySchedule as CourseWeeklyScheduleModel } from '@prisma/client';
import { IsInt, IsNotEmpty, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateCourseWeeklyScheduleDto {
  @ApiProperty({ description: '골프 코스 ID' })
  @IsInt()
  @IsNotEmpty()
  golfCourseId: number;

  @ApiProperty({ description: '요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  @IsNotEmpty()
  dayOfWeek: number;

  @ApiProperty({ description: '오픈 시간 (HH:MM 형식)', example: '09:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime must be in HH:MM format' })
  openTime: string;

  @ApiProperty({ description: '마감 시간 (HH:MM 형식)', example: '18:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime must be in HH:MM format' })
  closeTime: string;

  @ApiProperty({ description: '슬롯 지속 시간 (분 단위)', example: 60 })
  @IsInt()
  @Min(10) // 최소 10분
  @IsNotEmpty()
  slotDuration: number;

  @ApiProperty({ description: '슬롯당 최대 예약 가능 인원', example: 4, default: 4, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxCapacity?: number = 4;
}

export class UpdateCourseWeeklyScheduleDto extends PartialType(CreateCourseWeeklyScheduleDto) {}

export class CourseWeeklyScheduleResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  golfCourseId: number;
  @ApiProperty()
  dayOfWeek: number;
  @ApiProperty()
  openTime: string;
  @ApiProperty()
  closeTime: string;
  @ApiProperty()
  slotDuration: number;
  @ApiProperty()
  maxCapacity: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: CourseWeeklyScheduleModel): CourseWeeklyScheduleResponseDto {
    return {
      id: entity.id,
      golfCourseId: entity.golfCourseId,
      dayOfWeek: entity.dayOfWeek,
      openTime: entity.openTime,
      closeTime: entity.closeTime,
      slotDuration: entity.slotDuration,
      maxCapacity: entity.maxCapacity,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

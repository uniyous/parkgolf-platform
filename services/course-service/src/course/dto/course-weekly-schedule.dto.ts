import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CourseWeeklySchedule as CourseWeeklyScheduleModel } from '@prisma/client';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateCourseWeeklyScheduleDto {
  @ApiProperty({ description: '골프 코스 ID' })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

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

  @ApiProperty({ description: '활성화 여부', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseWeeklyScheduleDto extends PartialType(CreateCourseWeeklyScheduleDto) {}

export class CourseWeeklyScheduleResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  courseId: number;
  @ApiProperty()
  dayOfWeek: number;
  @ApiProperty()
  openTime: string;
  @ApiProperty()
  closeTime: string;
  @ApiProperty()
  isActive: boolean;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: CourseWeeklyScheduleModel): CourseWeeklyScheduleResponseDto {
    return {
      id: entity.id,
      courseId: entity.courseId,
      dayOfWeek: entity.dayOfWeek,
      openTime: entity.openTime,
      closeTime: entity.closeTime,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

import { CourseWeeklySchedule as CourseWeeklyScheduleModel } from '@prisma/client';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateCourseWeeklyScheduleDto {
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsNotEmpty()
  dayOfWeek: number;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime must be in HH:MM format' })
  openTime: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime must be in HH:MM format' })
  closeTime: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseWeeklyScheduleDto {
  @IsOptional()
  @IsInt()
  courseId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime must be in HH:MM format' })
  openTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime must be in HH:MM format' })
  closeTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface CourseWeeklyScheduleResponseDto {
  id: number;
  courseId: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapCourseWeeklyScheduleFromEntity(entity: CourseWeeklyScheduleModel): CourseWeeklyScheduleResponseDto {
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

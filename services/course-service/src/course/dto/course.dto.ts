import { CourseStatus, Course as CourseModel } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  subtitle?: string;

  @IsInt()
  @IsNotEmpty()
  clubId: number;

  @IsInt()
  @IsNotEmpty()
  companyId: number;

  @IsInt()
  @IsOptional()
  @Min(9)
  @Max(9)
  holeCount?: number = 9;

  @IsInt()
  @IsOptional()
  @Min(27)
  @Max(45)
  par?: number = 36;

  @IsInt()
  @IsOptional()
  @Min(2000)
  @Max(5000)
  totalDistance?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  difficulty?: number = 3;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  scenicRating?: number = 3;

  @IsOptional()
  courseRating?: number;

  @IsOptional()
  slopeRating?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus = CourseStatus.ACTIVE;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  subtitle?: string;

  @IsOptional()
  @IsInt()
  clubId?: number;

  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsInt()
  @Min(9)
  @Max(9)
  holeCount?: number;

  @IsOptional()
  @IsInt()
  @Min(27)
  @Max(45)
  par?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(5000)
  totalDistance?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  scenicRating?: number;

  @IsOptional()
  courseRating?: number;

  @IsOptional()
  slopeRating?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}

export interface CourseResponseDto {
  id: number;
  name: string;
  code: string;
  subtitle?: string;
  clubId: number;
  companyId: number;
  holeCount: number;
  par: number;
  totalDistance?: number;
  difficulty: number;
  scenicRating: number;
  courseRating?: number;
  slopeRating?: number;
  imageUrl?: string;
  description?: string;
  status: CourseStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapCourseFromEntity(entity: CourseModel): CourseResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    code: entity.code,
    subtitle: entity.subtitle,
    clubId: entity.clubId,
    companyId: entity.companyId,
    holeCount: entity.holeCount,
    par: entity.par,
    totalDistance: entity.totalDistance,
    difficulty: entity.difficulty,
    scenicRating: entity.scenicRating,
    courseRating: entity.courseRating,
    slopeRating: entity.slopeRating,
    imageUrl: entity.imageUrl,
    description: entity.description,
    status: entity.status,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class FindCoursesQueryDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  clubId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  companyId?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}

import { CourseStatus, Course as CourseModel, Company, Club, Hole } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { HoleResponseDto, HoleWithRelations } from './hole.dto';

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

/** Course 엔티티 타입 (관계 포함) */
export type CourseWithRelations = CourseModel & {
  company?: Company;
  club?: Club;
  holes?: HoleWithRelations[];
};

/** Course 응답 DTO */
export class CourseResponseDto {
  id: number;
  name: string;
  code: string;
  subtitle: string | null;
  clubId: number;
  companyId: number;
  holeCount: number;
  par: number;
  totalDistance: number | null;
  difficulty: number;
  scenicRating: number;
  courseRating: number | null;
  slopeRating: number | null;
  imageUrl: string | null;
  description: string | null;
  status: CourseStatus;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  company?: Company;
  club?: Club;
  holes?: HoleResponseDto[];

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: CourseWithRelations): CourseResponseDto {
    const dto = new CourseResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.subtitle = entity.subtitle;
    dto.clubId = entity.clubId;
    dto.companyId = entity.companyId;
    dto.holeCount = entity.holeCount;
    dto.par = entity.par;
    dto.totalDistance = entity.totalDistance;
    dto.difficulty = entity.difficulty;
    dto.scenicRating = entity.scenicRating;
    dto.courseRating = entity.courseRating;
    dto.slopeRating = entity.slopeRating;
    dto.imageUrl = entity.imageUrl;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    dto.company = entity.company;
    dto.club = entity.club;
    dto.holes = entity.holes?.map(hole => HoleResponseDto.fromEntity(hole));
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: CourseWithRelations[]): CourseResponseDto[] {
    return entities.map(entity => CourseResponseDto.fromEntity(entity));
  }
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

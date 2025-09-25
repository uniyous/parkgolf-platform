import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CourseStatus, Course as CourseModel } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: '골프 코스 이름', example: 'A코스' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '코스 코드', example: 'A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({ description: '코스 부제목', example: 'Lake', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  subtitle?: string;

  @ApiProperty({ description: '클럽 ID' })
  @IsInt()
  @IsNotEmpty()
  clubId: number;

  @ApiProperty({ description: '골프 회사 ID (하위호환성)' })
  @IsInt()
  @IsNotEmpty()
  companyId: number;

  @ApiProperty({ description: '홀 수', example: 9, default: 9 })
  @IsInt()
  @IsOptional()
  @Min(9)
  @Max(9)
  holeCount?: number = 9;

  @ApiProperty({ description: '파 합계', example: 36, default: 36 })
  @IsInt()
  @IsOptional()
  @Min(27)
  @Max(45)
  par?: number = 36;

  @ApiProperty({ description: '총 거리 (미터)', example: 3200, required: false })
  @IsInt()
  @IsOptional()
  @Min(2000)
  @Max(5000)
  totalDistance?: number;

  @ApiProperty({ description: '난이도 (1-5)', example: 3, default: 3 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  difficulty?: number = 3;

  @ApiProperty({ description: '경치 점수 (1-5)', example: 3, default: 3 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  scenicRating?: number = 3;

  @ApiProperty({ description: '코스 레이팅', required: false })
  @IsOptional()
  courseRating?: number;

  @ApiProperty({ description: '슬로프 레이팅', required: false })
  @IsOptional()
  slopeRating?: number;

  @ApiProperty({ description: '코스 이미지 URL', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: '코스 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '코스 상태',
    enum: CourseStatus,
    example: CourseStatus.ACTIVE,
    default: CourseStatus.ACTIVE,
    required: false,
  })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus = CourseStatus.ACTIVE;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  // companyId는 일반적으로 업데이트 시 변경하지 않거나, 특별한 로직이 필요합니다.
  // 여기서는 PartialType으로 인해 선택 사항이 됩니다.
  // 만약 companyId 변경을 허용하지 않으려면 Omit으로 제외하거나,
  // 서비스 로직에서 변경 시도를 막아야 합니다.
  @IsOptional()
  @IsInt()
  companyId?: number;
}

export class CourseResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  code: string;
  @ApiProperty({ required: false })
  subtitle?: string;
  @ApiProperty()
  clubId: number;
  @ApiProperty()
  companyId: number;
  @ApiProperty()
  holeCount: number;
  @ApiProperty()
  par: number;
  @ApiProperty({ required: false })
  totalDistance?: number;
  @ApiProperty()
  difficulty: number;
  @ApiProperty()
  scenicRating: number;
  @ApiProperty({ required: false })
  courseRating?: number;
  @ApiProperty({ required: false })
  slopeRating?: number;
  @ApiProperty({ required: false })
  imageUrl?: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty({ enum: CourseStatus })
  status: CourseStatus;
  @ApiProperty()
  isActive: boolean;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  // 선택적으로 포함될 수 있는 관계 데이터
  // @ApiProperty({ type: () => GolfClubResponseDto, required: false })
  // golfClub?: GolfClubResponseDto;
  // @ApiProperty({ type: () => CompanyResponseDto, required: false })
  // company?: CompanyResponseDto;

  static fromEntity(entity: CourseModel): CourseResponseDto {
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
    } as CourseResponseDto;
  }
}

export class FindCoursesQueryDto {
  @ApiProperty({ description: '클럽 ID로 필터링', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  clubId?: number;

  @ApiProperty({ description: '골프 회사 ID로 필터링 (하위호환성)', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  companyId?: number;

  @ApiProperty({ description: '코스 이름으로 검색 (부분 일치)', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '코스 코드로 검색', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: '난이도로 필터링 (1-5)', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiProperty({ description: '코스 상태로 필터링', enum: CourseStatus, required: false })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @ApiProperty({ description: '페이지 번호', example: 1, default: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '페이지 당 항목 수', example: 10, default: 10, required: false })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}

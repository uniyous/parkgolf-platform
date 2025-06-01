import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CourseStatus, GolfCourse as GolfCourseModel } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreateGolfCourseDto {
  @ApiProperty({ description: '골프 코스 이름', example: '레이크 코스' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '골프 회사 ID' })
  @IsInt()
  @IsNotEmpty()
  golfCompanyId: number;

  @ApiProperty({ description: '코스 위치', example: '서울시 강남구 파크골프장 B코스', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiProperty({ description: '코스 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '홀 수', example: 9, default: 9, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  holeCount?: number = 9;

  @ApiProperty({ description: '코스 대표 이미지 URL', example: 'https://example.com/course_image.jpg', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: '코스 연락처 정보', example: '02-123-4567', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactInfo?: string;

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

export class UpdateGolfCourseDto extends PartialType(CreateGolfCourseDto) {
  // golfCompanyId는 일반적으로 업데이트 시 변경하지 않거나, 특별한 로직이 필요합니다.
  // 여기서는 PartialType으로 인해 선택 사항이 됩니다.
  // 만약 golfCompanyId 변경을 허용하지 않으려면 Omit으로 제외하거나,
  // 서비스 로직에서 변경 시도를 막아야 합니다.
  @IsOptional()
  @IsInt()
  golfCompanyId?: number; // 변경을 허용하지 않으려면 이 필드를 DTO에서 제거
}

export class GolfCourseResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  golfCompanyId: number;
  @ApiProperty({ required: false })
  location?: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty()
  holeCount: number;
  @ApiProperty({ required: false })
  imageUrl?: string;
  @ApiProperty({ required: false })
  contactInfo?: string;
  @ApiProperty({ enum: CourseStatus })
  status: CourseStatus;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  // 선택적으로 포함될 수 있는 관계 데이터 (예시)
  // @ApiProperty({ type: () => GolfCompanyResponseDto, required: false })
  // golfCompany?: GolfCompanyResponseDto; // GolfCompany DTO 필요

  static fromEntity(entity: GolfCourseModel): GolfCourseResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      golfCompanyId: entity.golfCompanyId,
      location: entity.location,
      description: entity.description,
      holeCount: entity.holeCount,
      imageUrl: entity.imageUrl,
      contactInfo: entity.contactInfo,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    } as GolfCourseResponseDto;
  }
}

export class FindGolfCoursesQueryDto {
  @ApiProperty({ description: '골프 회사 ID로 필터링', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  golfCompanyId?: number;

  @ApiProperty({ description: '코스 이름으로 검색 (부분 일치)', required: false })
  @IsString()
  @IsOptional()
  name?: string;

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

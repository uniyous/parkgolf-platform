import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CourseStatus, Course as CourseModel } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: '골프 코스 이름', example: '레이크 코스' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '골프 회사 ID' })
  @IsInt()
  @IsNotEmpty()
  companyId: number;

  @ApiProperty({ description: '코스 주소', example: '서울시 강남구 파크골프장 B코스' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiProperty({ description: '코스 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '코스 연락처', example: '02-123-4567', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  phoneNumber?: string;

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
  companyId: number;
  @ApiProperty()
  address: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty({ required: false })
  phoneNumber?: string;
  @ApiProperty({ enum: CourseStatus })
  status: CourseStatus;
  @ApiProperty()
  isActive: boolean;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  // 선택적으로 포함될 수 있는 관계 데이터 (예시)
  // @ApiProperty({ type: () => CompanyResponseDto, required: false })
  // company?: CompanyResponseDto; // Company DTO 필요

  static fromEntity(entity: CourseModel): CourseResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      companyId: entity.companyId,
      address: entity.address,
      description: entity.description,
      phoneNumber: entity.phoneNumber,
      status: entity.status,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    } as CourseResponseDto;
  }
}

export class FindCoursesQueryDto {
  @ApiProperty({ description: '골프 회사 ID로 필터링', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  companyId?: number;

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

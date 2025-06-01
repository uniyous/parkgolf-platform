import { ApiProperty, PartialType } from '@nestjs/swagger';
import { GolfHole as GolfHoleModel } from '@prisma/client';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateGolfHoleDto {
  @ApiProperty({ description: '홀 번호 (1, 2, ...)', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  holeNumber: number;

  @ApiProperty({ description: '기준 타수 (Par)', example: 4 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  par: number;

  // golfCourseId는 경로 파라미터로 받을 것이므로 DTO에서는 제외
  // @ApiProperty({ description: '골프 코스 ID' })
  // @IsInt()
  // @IsNotEmpty()
  // golfCourseId: number;

  @ApiProperty({ description: '홀 거리 (미터 단위)', example: 350, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  distance?: number;

  @ApiProperty({ description: '홀 지도 이미지 URL', example: 'https://example.com/hole1_map.jpg', required: false })
  @IsUrl()
  @IsOptional()
  mapUrl?: string;

  @ApiProperty({ description: '홀 설명', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

export class UpdateGolfHoleDto extends PartialType(CreateGolfHoleDto) {
  // holeNumber는 업데이트 시 식별자로 사용되거나 변경 불가 항목일 수 있음
  // 여기서는 PartialType으로 인해 선택 사항이 됨.
  // 서비스 로직에서 holeNumber 변경 시 중복 체크 필요
  @IsOptional()
  @IsInt()
  @Min(1)
  holeNumber?: number;
}

export class GolfHoleResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  golfCourseId: number;
  @ApiProperty()
  holeNumber: number;
  @ApiProperty()
  par: number;
  @ApiProperty({ required: false })
  distance?: number;
  @ApiProperty({ required: false })
  mapUrl?: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  // 선택적으로 포함될 수 있는 관계 데이터 (예시)
  // @ApiProperty({ type: () => GolfTeeBoxResponseDto, isArray: true, required: false })
  // golfTeeBoxes?: GolfTeeBoxResponseDto[];

  static fromEntity(entity: GolfHoleModel): GolfHoleResponseDto {
    return {
      id: entity.id,
      golfCourseId: entity.golfCourseId,
      holeNumber: entity.holeNumber,
      par: entity.par,
      distance: entity.distance,
      mapUrl: entity.mapUrl,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    } as GolfHoleResponseDto;
  }
}

export class FindGolfHolesQueryDto {
  // golfCourseId는 경로 파라미터로 받으므로 여기서는 제외
  // @ApiProperty({ description: '골프 코스 ID로 필터링', required: false})
  // @IsInt()
  // @IsOptional()
  // @Min(1)
  // golfCourseId?: number;

  @ApiProperty({ description: '홀 번호로 필터링', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  holeNumber?: number;

  @ApiProperty({ description: '기준 타수(Par)로 필터링', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  par?: number;
}

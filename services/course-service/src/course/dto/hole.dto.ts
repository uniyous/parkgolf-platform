import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Hole as HoleModel } from '@prisma/client';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateHoleDto {
  @ApiProperty({ description: '홀 번호 (1-9)', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  holeNumber: number;

  @ApiProperty({ description: '기준 타수 (Par) - 3, 4, 5', example: 4 })
  @IsInt()
  @Min(3)
  @IsNotEmpty()
  par: number;

  @ApiProperty({ description: '홀 거리 (미터 단위)', example: 350 })
  @IsInt()
  @Min(50)
  @IsNotEmpty()
  distance: number;

  @ApiProperty({ description: '핸디캡 (1-18)', example: 5 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  handicap: number;

  @ApiProperty({ description: '홀 설명', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '플레이 팁', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  tips?: string;

  @ApiProperty({ description: '홀 이미지 URL', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

}

export class UpdateHoleDto extends PartialType(CreateHoleDto) {
  // holeNumber는 업데이트 시 식별자로 사용되거나 변경 불가 항목일 수 있음
  // 여기서는 PartialType으로 인해 선택 사항이 됨.
  // 서비스 로직에서 holeNumber 변경 시 중복 체크 필요
  @IsOptional()
  @IsInt()
  @Min(1)
  holeNumber?: number;
}

export class HoleResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  courseId: number;
  @ApiProperty()
  holeNumber: number;
  @ApiProperty()
  par: number;
  @ApiProperty()
  distance: number;
  @ApiProperty()
  handicap: number;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty({ required: false })
  tips?: string;
  @ApiProperty({ required: false })
  imageUrl?: string;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  // 선택적으로 포함될 수 있는 관계 데이터 (예시)
  // @ApiProperty({ type: () => TeeBoxResponseDto, isArray: true, required: false })
  // teeBoxes?: TeeBoxResponseDto[];

  static fromEntity(entity: HoleModel): HoleResponseDto {
    return {
      id: entity.id,
      courseId: entity.courseId,
      holeNumber: entity.holeNumber,
      par: entity.par,
      distance: entity.distance,
      handicap: entity.handicap,
      description: entity.description,
      tips: entity.tips,
      imageUrl: entity.imageUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    } as HoleResponseDto;
  }
}

export class FindHolesQueryDto {
  // courseId는 경로 파라미터로 받으므로 여기서는 제외
  // @ApiProperty({ description: '골프 코스 ID로 필터링', required: false})
  // @IsInt()
  // @IsOptional()
  // @Min(1)
  // courseId?: number;

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

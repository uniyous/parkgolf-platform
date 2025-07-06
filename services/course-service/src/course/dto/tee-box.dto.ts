import { ApiProperty, PartialType } from '@nestjs/swagger';
import { TeeBox as TeeBoxModel } from '@prisma/client';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTeeBoxDto {
  @ApiProperty({ description: '티박스 이름 (예: White Tee, Red Tee, Blue Tee)', example: 'White Tee' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '해당 티박스에서의 홀까지의 거리 (미터 단위)', example: 320 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  distance: number;

  // holeId는 경로 파라미터로 받을 것이므로 DTO에서는 제외
  // @ApiProperty({ description: '골프 홀 ID' })
  // @IsInt()
  // @IsNotEmpty()
  // holeId: number;
}

export class UpdateTeeBoxDto extends PartialType(CreateTeeBoxDto) {}

export class TeeBoxResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  holeId: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  distance: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: TeeBoxModel): TeeBoxResponseDto {
    return {
      id: entity.id,
      holeId: entity.holeId,
      name: entity.name,
      distance: entity.distance,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class FindTeeBoxesQueryDto {
  // holeId는 경로 파라미터로 받으므로 여기서는 제외
  // @ApiProperty({ description: '골프 홀 ID로 필터링', required: false})
  // @IsInt()
  // @IsOptional()
  // @Min(1)
  // holeId?: number;

  @ApiProperty({ description: '티박스 이름으로 검색 (부분 일치)', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}

import { Hole as HoleModel, Course, TeeBox, TeeBoxLevel } from '@prisma/client';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateHoleDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  holeNumber: number;

  @IsInt()
  @Min(3)
  @IsNotEmpty()
  par: number;

  @IsInt()
  @Min(50)
  @IsNotEmpty()
  distance: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  handicap: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  tips?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}

export class UpdateHoleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  holeNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  par?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  distance?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  handicap?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tips?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

/** TeeBox 엔티티 타입 (관계 포함) */
export type TeeBoxWithRelations = TeeBox & {
  hole?: HoleModel;
};

/** TeeBox 응답 DTO */
export class TeeBoxResponseDto {
  id: number;
  holeId: number;
  name: string;
  color: string;
  distance: number;
  difficulty: TeeBoxLevel | null;
  createdAt: string | null;
  updatedAt: string | null;

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: TeeBoxWithRelations): TeeBoxResponseDto {
    const dto = new TeeBoxResponseDto();
    dto.id = entity.id;
    dto.holeId = entity.holeId;
    dto.name = entity.name;
    dto.color = entity.color;
    dto.distance = entity.distance;
    dto.difficulty = entity.difficulty;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: TeeBoxWithRelations[]): TeeBoxResponseDto[] {
    return entities.map(entity => TeeBoxResponseDto.fromEntity(entity));
  }
}

/** Hole 엔티티 타입 (관계 포함) */
export type HoleWithRelations = HoleModel & {
  course?: Course;
  teeBoxes?: TeeBox[];
};

/** Hole 응답 DTO */
export class HoleResponseDto {
  id: number;
  courseId: number;
  holeNumber: number;
  par: number;
  distance: number;
  handicap: number;
  description: string | null;
  tips: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  course?: Course;
  teeBoxes?: TeeBoxResponseDto[];

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: HoleWithRelations): HoleResponseDto {
    const dto = new HoleResponseDto();
    dto.id = entity.id;
    dto.courseId = entity.courseId;
    dto.holeNumber = entity.holeNumber;
    dto.par = entity.par;
    dto.distance = entity.distance;
    dto.handicap = entity.handicap;
    dto.description = entity.description;
    dto.tips = entity.tips;
    dto.imageUrl = entity.imageUrl;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    dto.course = entity.course;
    dto.teeBoxes = entity.teeBoxes?.map(teeBox => TeeBoxResponseDto.fromEntity(teeBox));
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: HoleWithRelations[]): HoleResponseDto[] {
    return entities.map(entity => HoleResponseDto.fromEntity(entity));
  }
}

export class FindHolesQueryDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  holeNumber?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  par?: number;
}

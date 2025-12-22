import { Hole as HoleModel } from '@prisma/client';
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

export interface HoleResponseDto {
  id: number;
  courseId: number;
  holeNumber: number;
  par: number;
  distance: number;
  handicap: number;
  description?: string;
  tips?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapHoleFromEntity(entity: HoleModel): HoleResponseDto {
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
  };
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

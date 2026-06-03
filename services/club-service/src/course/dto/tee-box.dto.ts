import { TeeBox as TeeBoxModel, TeeBoxLevel } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTeeBoxDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  color: string;

  @IsInt()
  @Min(50)
  @IsNotEmpty()
  distance: number;

  @IsEnum(TeeBoxLevel)
  @IsOptional()
  difficulty?: TeeBoxLevel = TeeBoxLevel.INTERMEDIATE;
}

export class UpdateTeeBoxDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(50)
  distance?: number;

  @IsOptional()
  @IsEnum(TeeBoxLevel)
  difficulty?: TeeBoxLevel;
}

export interface TeeBoxResponseDto {
  id: number;
  holeId: number;
  name: string;
  color: string;
  distance: number;
  difficulty: TeeBoxLevel;
  createdAt: Date;
  updatedAt: Date;
}

export function mapTeeBoxFromEntity(entity: TeeBoxModel): TeeBoxResponseDto {
  return {
    id: entity.id,
    holeId: entity.holeId,
    name: entity.name,
    color: entity.color,
    distance: entity.distance,
    difficulty: entity.difficulty,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class FindTeeBoxesQueryDto {
  @IsString()
  @IsOptional()
  name?: string;
}

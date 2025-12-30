import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Game, Club, Course } from '@prisma/client';
import { ClubResponseDto, ClubWithRelations } from '../../club/dto/club.dto';
import { CourseResponseDto, CourseWithRelations } from '../../course/dto/course.dto';

export enum GameStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  frontNineCourseId: number;

  @IsNumber()
  @Type(() => Number)
  backNineCourseId: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(9)
  @Max(36)
  totalHoles?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(60)
  @Max(360)
  estimatedDuration?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(60)
  breakDuration?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  basePrice: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  weekendPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  holidayPrice?: number;

  @IsNumber()
  @Type(() => Number)
  clubId: number;

  @IsEnum(GameStatus)
  @IsOptional()
  status?: GameStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGameDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  frontNineCourseId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  backNineCourseId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(9)
  @Max(36)
  totalHoles?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(60)
  @Max(360)
  estimatedDuration?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(60)
  breakDuration?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(8)
  maxPlayers?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  basePrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  weekendPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  holidayPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  clubId?: number;

  @IsEnum(GameStatus)
  @IsOptional()
  status?: GameStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FindGamesQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  clubId?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(GameStatus)
  @IsOptional()
  status?: GameStatus;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SearchGamesQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  clubId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(8)
  minPlayers?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'price' | 'name' | 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Decimal/number를 number로 변환 */
function toNumber(value: number | { toNumber?: () => number } | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

/** Game 엔티티 타입 (관계 포함) */
export type GameWithRelations = Game & {
  club?: ClubWithRelations;
  frontNineCourse?: CourseWithRelations;
  backNineCourse?: CourseWithRelations;
};

/** Game 응답 DTO */
export class GameResponseDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  frontNineCourseId: number;
  backNineCourseId: number;
  frontNineCourse: CourseResponseDto | null;
  backNineCourse: CourseResponseDto | null;
  totalHoles: number;
  estimatedDuration: number;
  breakDuration: number;
  maxPlayers: number;
  basePrice: number;
  weekendPrice: number | null;
  holidayPrice: number | null;
  clubId: number;
  club: ClubResponseDto | null;
  status: GameStatus;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: GameWithRelations): GameResponseDto {
    const dto = new GameResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.description = entity.description;
    dto.frontNineCourseId = entity.frontNineCourseId;
    dto.backNineCourseId = entity.backNineCourseId;
    dto.frontNineCourse = entity.frontNineCourse ? CourseResponseDto.fromEntity(entity.frontNineCourse) : null;
    dto.backNineCourse = entity.backNineCourse ? CourseResponseDto.fromEntity(entity.backNineCourse) : null;
    dto.totalHoles = entity.totalHoles;
    dto.estimatedDuration = entity.estimatedDuration;
    dto.breakDuration = entity.breakDuration;
    dto.maxPlayers = entity.maxPlayers;
    dto.basePrice = toNumber(entity.basePrice) ?? 0;
    dto.weekendPrice = toNumber(entity.weekendPrice);
    dto.holidayPrice = toNumber(entity.holidayPrice);
    dto.clubId = entity.clubId;
    dto.club = entity.club ? ClubResponseDto.fromEntity(entity.club) : null;
    dto.status = entity.status as GameStatus;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: GameWithRelations[]): GameResponseDto[] {
    return entities.map(entity => GameResponseDto.fromEntity(entity));
  }
}

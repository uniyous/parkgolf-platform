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

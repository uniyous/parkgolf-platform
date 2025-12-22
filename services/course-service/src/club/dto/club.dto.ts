import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsUrl,
  IsArray,
  IsEnum,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

export enum ClubStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  SEASONAL_CLOSED = 'SEASONAL_CLOSED',
}

export class OperatingHoursDto {
  @IsString()
  open: string;

  @IsString()
  close: string;
}

export class SeasonInfoDto {
  @IsEnum(['peak', 'regular', 'off'])
  type: 'peak' | 'regular' | 'off';

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;
}

export class CreateClubDto {
  @IsString()
  name: string;

  @IsInt()
  companyId: number;

  @IsString()
  location: string;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeasonInfoDto)
  seasonInfo?: SeasonInfoDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClubDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalHoles?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCourses?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeasonInfoDto)
  seasonInfo?: SeasonInfoDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ClubFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @IsOptional()
  @IsInt()
  @Min(9)
  minHoles?: number;

  @IsOptional()
  @IsInt()
  @Max(72)
  maxHoles?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface ClubResponseDto {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  totalHoles: number;
  totalCourses: number;
  status: ClubStatus;
  operatingHours?: OperatingHoursDto;
  seasonInfo?: SeasonInfoDto;
  facilities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  company?: any;
  courses?: any[];
}

export interface ClubListResponseDto {
  data: ClubResponseDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

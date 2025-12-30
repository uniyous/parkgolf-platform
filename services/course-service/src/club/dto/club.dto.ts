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
import { Club, Company, Course } from '@prisma/client';
import { CourseResponseDto } from '../../course/dto/course.dto';

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

/** Club 엔티티 타입 (관계 포함) */
export type ClubWithRelations = Club & {
  company?: Company;
  courses?: Course[];
};

/** Club 응답 DTO */
export class ClubResponseDto {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email: string | null;
  website: string | null;
  totalHoles: number;
  totalCourses: number;
  status: ClubStatus;
  operatingHours: Record<string, unknown> | null;
  seasonInfo: Record<string, unknown> | null;
  facilities: string[];
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  company?: Company;
  courses?: CourseResponseDto[];

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: ClubWithRelations): ClubResponseDto {
    const dto = new ClubResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.companyId = entity.companyId;
    dto.location = entity.location;
    dto.address = entity.address;
    dto.phone = entity.phone;
    dto.email = entity.email;
    dto.website = entity.website;
    dto.totalHoles = entity.totalHoles;
    dto.totalCourses = entity.totalCourses;
    dto.status = entity.status as ClubStatus;
    dto.operatingHours = entity.operatingHours as Record<string, unknown> | null;
    dto.seasonInfo = entity.seasonInfo as Record<string, unknown> | null;
    dto.facilities = entity.facilities;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    dto.company = entity.company;
    dto.courses = entity.courses?.map(course => CourseResponseDto.fromEntity(course));
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: ClubWithRelations[]): ClubResponseDto[] {
    return entities.map(entity => ClubResponseDto.fromEntity(entity));
  }
}

export interface ClubListResponseDto {
  data: ClubResponseDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

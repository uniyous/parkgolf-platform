import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  IsObject,
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
  @ApiProperty({ example: '06:00' })
  @IsString()
  open: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  close: string;
}

export class SeasonInfoDto {
  @ApiProperty({ enum: ['peak', 'regular', 'off'] })
  @IsEnum(['peak', 'regular', 'off'])
  type: 'peak' | 'regular' | 'off';

  @ApiProperty({ example: '2024-01-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2024-03-31' })
  @IsString()
  endDate: string;
}

export class CreateClubDto {
  @ApiProperty({ example: '제주 골프클럽' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: '제주특별자치도' })
  @IsString()
  location: string;

  @ApiProperty({ example: '제주특별자치도 제주시 한림읍 골프로 123' })
  @IsString()
  address: string;

  @ApiProperty({ example: '064-123-4567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'info@jejugolf.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://jejugolf.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ type: OperatingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional({ type: SeasonInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeasonInfoDto)
  seasonInfo?: SeasonInfoDto;

  @ApiPropertyOptional({ example: ['카트도로', '연습장', '클럽하우스'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({ enum: ClubStatus, default: ClubStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClubDto {
  @ApiPropertyOptional({ example: '제주 골프클럽' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  companyId?: number;

  @ApiPropertyOptional({ example: '제주특별자치도' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '제주특별자치도 제주시 한림읍 골프로 123' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '064-123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@jejugolf.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://jejugolf.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  totalHoles?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  totalCourses?: number;

  @ApiPropertyOptional({ type: OperatingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional({ type: SeasonInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeasonInfoDto)
  seasonInfo?: SeasonInfoDto;

  @ApiPropertyOptional({ example: ['카트도로', '연습장', '클럽하우스'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({ enum: ClubStatus })
  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ClubFilterDto {
  @ApiPropertyOptional({ example: '제주' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '제주특별자치도' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ClubStatus })
  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsInt()
  @Min(9)
  minHoles?: number;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsInt()
  @Max(72)
  maxHoles?: number;

  @ApiPropertyOptional({ example: ['연습장', '클럽하우스'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({ enum: ['name', 'totalHoles', 'createdAt'], default: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ClubResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  companyId: number;

  @ApiProperty()
  location: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiProperty()
  totalHoles: number;

  @ApiProperty()
  totalCourses: number;

  @ApiProperty({ enum: ClubStatus })
  status: ClubStatus;

  @ApiPropertyOptional()
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional()
  seasonInfo?: SeasonInfoDto;

  @ApiProperty()
  facilities: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  company?: any;

  @ApiPropertyOptional()
  courses?: any[];
}

export class ClubListResponseDto {
  @ApiProperty({ type: [ClubResponseDto] })
  data: ClubResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
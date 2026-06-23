import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course name',
    example: 'Spring Valley Golf Course',
  })
  @IsString()
  @IsNotEmpty({ message: 'Course name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'A beautiful 18-hole golf course with scenic views',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Company ID that owns the course',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Company ID is required' })
  companyId: number;

  @ApiPropertyOptional({
    description: 'Number of holes',
    example: 18,
    default: 18,
  })
  @IsOptional()
  @IsNumber()
  @Min(9)
  @Max(36)
  holeCount?: number;

  @ApiPropertyOptional({
    description: 'Course address',
    example: '123 Golf Street, Seoul',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Course phone number',
    example: '+82-2-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Course latitude',
    example: 37.5665,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Course longitude',
    example: 126.978,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Is course active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({
    description: 'Course name',
    example: 'Spring Valley Golf Course',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'A beautiful 18-hole golf course with scenic views',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Number of holes',
    example: 18,
  })
  @IsOptional()
  @IsNumber()
  @Min(9)
  @Max(36)
  holeCount?: number;

  @ApiPropertyOptional({
    description: 'Course address',
    example: '123 Golf Street, Seoul',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Course phone number',
    example: '+82-2-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Course latitude',
    example: 37.5665,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Course longitude',
    example: 126.978,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Is course active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CourseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by company ID',
    example: '1',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

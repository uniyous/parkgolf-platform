import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Park Golf Inc.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Company description',
    example: 'A leading golf company in Korea',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Company address',
    example: '456 Business Street, Seoul',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Company phone number',
    example: '+82-2-9876-5432',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company email',
    example: 'contact@parkgolf.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Company website',
    example: 'https://www.parkgolf.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description: 'Business registration number',
    example: '123-45-67890',
  })
  @IsOptional()
  @IsString()
  businessNumber?: string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Park Golf Inc.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Company description',
    example: 'A leading golf company in Korea',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Company address',
    example: '456 Business Street, Seoul',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Company phone number',
    example: '+82-2-9876-5432',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company email',
    example: 'contact@parkgolf.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Company website',
    example: 'https://www.parkgolf.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description: 'Business registration number',
    example: '123-45-67890',
  })
  @IsOptional()
  @IsString()
  businessNumber?: string;
}

export class CompanyFilterDto {
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
  limit?: number = 20;
}

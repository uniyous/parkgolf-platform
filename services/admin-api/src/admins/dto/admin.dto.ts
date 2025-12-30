import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  IsNumber,
} from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({
    description: 'Admin full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Admin role code',
    example: 'ADMIN',
    enum: ['ADMIN', 'SUPPORT', 'MANAGER', 'STAFF', 'VIEWER'],
  })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({
    description: 'Admin phone number',
    example: '+82-10-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'IT',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'System administrator',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Admin full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Admin role code',
    example: 'ADMIN',
    enum: ['ADMIN', 'SUPPORT', 'MANAGER', 'STAFF', 'VIEWER'],
  })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({
    description: 'Admin phone number',
    example: '+82-10-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'IT',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'System administrator',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAdminStatusDto {
  @ApiProperty({
    description: 'Admin active status',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty({ message: 'isActive is required' })
  isActive: boolean;
}

export class UpdateAdminPermissionsDto {
  @ApiProperty({
    description: 'Permission IDs to assign to admin',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty({ message: 'Permission IDs are required' })
  permissionIds: number[];
}

/** Admin 응답 DTO - auth-service AdminResponseDto와 일치 */
export class AdminResponseDto {
  @ApiProperty({ description: 'Admin ID' })
  id: number;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Admin name' })
  name: string;

  @ApiProperty({ description: 'Role code' })
  roleCode: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone: string | null;

  @ApiPropertyOptional({ description: 'Department' })
  department: string | null;

  @ApiPropertyOptional({ description: 'Description' })
  description: string | null;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last login at' })
  lastLoginAt: string | null;

  @ApiPropertyOptional({ description: 'Created at' })
  createdAt: string | null;

  @ApiPropertyOptional({ description: 'Updated at' })
  updatedAt: string | null;
}

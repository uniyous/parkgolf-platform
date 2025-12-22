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
    description: 'Admin username',
    example: 'adminuser',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  username: string;

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
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    description: 'Admin full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Admin role',
    example: 'ADMIN',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Admin phone number',
    example: '+82-10-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'Admin username',
    example: 'adminuser',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  username?: string;

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
    description: 'Admin role',
    example: 'ADMIN',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Admin phone number',
    example: '+82-10-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;
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

export class AdminResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

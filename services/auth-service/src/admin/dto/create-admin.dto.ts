import { IsEmail, IsString, IsNotEmpty, MinLength, IsIn, IsOptional } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_ANALYST', 'COMPANY_OWNER', 'COMPANY_MANAGER', 'COURSE_MANAGER', 'STAFF', 'READONLY_STAFF'])
  @IsOptional()
  roleCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
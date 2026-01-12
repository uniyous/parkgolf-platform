import { IsEmail, IsString, IsNotEmpty, MinLength, IsIn, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Admin } from '@prisma/client';

/** Admin 엔티티 타입 (관계 포함 가능, roleCode는 AdminCompany에서 계산됨) */
export type AdminWithRelations = Admin & { roleCode?: string; companies?: any[] };

/** Admin 응답 DTO - password 제외 */
export class AdminResponseDto {
  @ApiProperty({ description: 'Admin ID' })
  id: number;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Admin name' })
  name: string;

  @ApiProperty({ description: 'Role code (from primary company)', required: false })
  roleCode?: string;

  @ApiProperty({ description: 'Phone number' })
  phone: string | null;

  @ApiProperty({ description: 'Department' })
  department: string | null;

  @ApiProperty({ description: 'Description' })
  description: string | null;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Last login at' })
  lastLoginAt: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: string | null;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: string | null;

  /**
   * 엔티티를 DTO로 변환 (password 제외)
   * roleCode는 AdminCompany에서 계산된 값을 사용
   */
  static fromEntity(entity: AdminWithRelations): AdminResponseDto {
    const dto = new AdminResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.roleCode = entity.roleCode || 'COMPANY_VIEWER';
    dto.phone = entity.phone;
    dto.department = entity.department;
    dto.description = entity.description;
    dto.isActive = entity.isActive;
    dto.lastLoginAt = entity.lastLoginAt?.toISOString() ?? null;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: AdminWithRelations[]): AdminResponseDto[] {
    return entities.map(entity => AdminResponseDto.fromEntity(entity));
  }
}

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

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Company ID to assign admin to' })
  companyId: number;

  @IsIn([
    'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER',
    'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'COMPANY_VIEWER',
  ])
  @IsOptional()
  @ApiProperty({ description: 'Role code for the company assignment', required: false })
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
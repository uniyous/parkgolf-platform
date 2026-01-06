import { IsOptional, IsString, IsUrl, MinLength, IsEmail, IsEnum, IsDateString } from 'class-validator';
import { Company, Club, Course } from '@prisma/client';

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

/** Company 엔티티 타입 (관계 포함) */
export type CompanyWithRelations = Company & {
  clubs?: Club[];
  courses?: Course[];
};

/** Company 응답 DTO */
export class CompanyResponseDto {
  id: number;
  name: string;
  businessNumber: string | null;
  description: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  establishedDate: string | null;
  logoUrl: string | null;
  status: CompanyStatus;
  isActive: boolean;
  coursesCount: number;
  clubsCount: number;
  createdAt: string | null;
  updatedAt: string | null;

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: CompanyWithRelations): CompanyResponseDto {
    const dto = new CompanyResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.businessNumber = entity.businessNumber;
    dto.description = entity.description;
    dto.address = entity.address;
    dto.phoneNumber = entity.phoneNumber;
    dto.email = entity.email;
    dto.website = entity.website;
    dto.establishedDate = entity.establishedDate?.toISOString() ?? null;
    dto.logoUrl = entity.logoUrl;
    dto.status = entity.status as CompanyStatus;
    dto.isActive = entity.isActive;
    dto.coursesCount = entity.courses?.length ?? 0;
    dto.clubsCount = entity.clubs?.length ?? 0;
    dto.createdAt = entity.createdAt?.toISOString() ?? null;
    dto.updatedAt = entity.updatedAt?.toISOString() ?? null;
    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: CompanyWithRelations[]): CompanyResponseDto[] {
    return entities.map(entity => CompanyResponseDto.fromEntity(entity));
  }
}

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  businessNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  establishedDate?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}

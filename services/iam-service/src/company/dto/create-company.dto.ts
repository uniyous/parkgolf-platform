import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { Company, CompanyStatus } from '@prisma/client';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CompanyResponseDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  businessNumber: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  status: CompanyStatus;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Company): CompanyResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      description: entity.description,
      businessNumber: entity.businessNumber,
      address: entity.address,
      phoneNumber: entity.phoneNumber,
      email: entity.email,
      website: entity.website,
      logoUrl: entity.logoUrl,
      status: entity.status,
      isActive: entity.isActive,
      metadata: entity.metadata as Record<string, any> | null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: Company[]): CompanyResponseDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}

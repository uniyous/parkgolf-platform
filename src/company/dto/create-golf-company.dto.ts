import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateGolfCompanyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

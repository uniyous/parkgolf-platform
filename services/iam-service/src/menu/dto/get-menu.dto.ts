import { IsArray, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetMenuByAdminDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsNotEmpty()
  @IsString()
  companyType: string;

  @IsOptional()
  @IsString()
  scope?: string;
}

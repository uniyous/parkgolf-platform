import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class GetMenuByAdminDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsNotEmpty()
  @IsString()
  companyType: string;

  @IsString()
  scope?: string;
}

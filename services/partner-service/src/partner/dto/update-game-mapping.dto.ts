import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateGameMappingDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsOptional()
  externalCourseName?: string;

  @IsString()
  @IsOptional()
  externalCourseId?: string;

  @IsNumber()
  @IsOptional()
  internalGameId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

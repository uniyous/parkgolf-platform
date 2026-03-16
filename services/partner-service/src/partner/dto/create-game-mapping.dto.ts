import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateGameMappingDto {
  @IsNumber()
  partnerId: number;

  @IsString()
  externalCourseName: string;

  @IsString()
  @IsOptional()
  externalCourseId?: string;

  @IsNumber()
  internalGameId: number;
}

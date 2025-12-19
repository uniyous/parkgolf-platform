import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AdminFilterDto {
  @ApiPropertyOptional({
    description: 'Search in name, username, email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by admin role',
    example: 'ADMIN',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  take?: number = 20;
}

export class AdminListResponseDto {
  @ApiPropertyOptional()
  success: boolean;

  @ApiPropertyOptional()
  data: {
    admins: any[];
    total: number;
    page: number;
    totalPages: number;
  };
}

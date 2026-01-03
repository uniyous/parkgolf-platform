import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchGamesDto {
  @ApiPropertyOptional({ description: '검색어 (게임명, 클럽명, 지역)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '날짜 (YYYY-MM-DD) - 해당 날짜에 예약 가능한 타임슬롯이 있는 게임만 필터링' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: '클럽 ID' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  clubId?: number;

  @ApiPropertyOptional({ description: '최소 가격' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: '최대 가격' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: '최소 인원수' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(8)
  minPlayers?: number;

  @ApiPropertyOptional({ description: '정렬 기준', enum: ['price', 'name', 'createdAt'] })
  @IsString()
  @IsOptional()
  sortBy?: 'price' | 'name' | 'createdAt';

  @ApiPropertyOptional({ description: '정렬 순서', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

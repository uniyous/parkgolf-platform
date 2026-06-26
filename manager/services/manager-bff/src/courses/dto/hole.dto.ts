import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateHoleDto {
  @ApiProperty({
    description: 'Hole number',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Hole number is required' })
  @Min(1)
  @Max(36)
  holeNumber: number;

  @ApiProperty({
    description: 'Par for the hole',
    example: 4,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Par is required' })
  @Min(3)
  @Max(6)
  par: number;

  @ApiPropertyOptional({
    description: 'Distance in meters',
    example: 350,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiPropertyOptional({
    description: 'Hole description or notes',
    example: 'Dogleg left with water hazard',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Handicap stroke index',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(18)
  handicapStroke?: number;
}

export class UpdateHoleDto {
  @ApiPropertyOptional({
    description: 'Hole number',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(36)
  holeNumber?: number;

  @ApiPropertyOptional({
    description: 'Par for the hole',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(6)
  par?: number;

  @ApiPropertyOptional({
    description: 'Distance in meters',
    example: 350,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiPropertyOptional({
    description: 'Hole description or notes',
    example: 'Dogleg left with water hazard',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Handicap stroke index',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(18)
  handicapStroke?: number;
}

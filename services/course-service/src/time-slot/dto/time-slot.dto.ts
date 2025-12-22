import { IsInt, IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateTimeSlotsDto {
  @IsInt()
  @IsNotEmpty()
  courseId: number;
}

export class GetAvailableTimeSlotsDto {
  // 현재 스키마에서는 날짜별 슬롯이 없으므로 빈 DTO
}

export interface CourseTimeSlotResponseDto {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  courseId: number;
  maxPlayers: number;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapTimeSlotFromEntity(entity: any): CourseTimeSlotResponseDto {
  return {
    id: entity.id,
    date: entity.date,
    startTime: entity.startTime,
    endTime: entity.endTime,
    courseId: entity.courseId,
    maxPlayers: entity.maxPlayers,
    price: Number(entity.price),
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class GetSlotDetailsForBookingDto {
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  slotId: string;
}

export interface SlotDetailsForBookingResponseDto {
  id: string;
  courseId: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isAvailable: boolean;
}

export class CreateTimeSlotDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsNumber()
  @IsOptional()
  maxPlayers?: number = 4;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}

export class UpdateTimeSlotDto {
  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsInt()
  @IsOptional()
  courseId?: number;

  @IsNumber()
  @IsOptional()
  maxPlayers?: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TimeSlotFilterDto {
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  timeFrom?: string;

  @IsString()
  @IsOptional()
  timeTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: string = 'date';

  @IsString()
  @IsOptional()
  sortOrder?: string = 'asc';
}

export class BulkCreateTimeSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimeSlotDto)
  timeSlots: CreateTimeSlotDto[];
}

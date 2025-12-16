import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  timestamp: string;

  constructor(success: boolean, data?: T, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

export class PaginationDto {
  @ApiProperty({ default: 1 })
  page: number = 1;

  @ApiProperty({ default: 10 })
  limit: number = 10;

  @ApiProperty({ required: false })
  search?: string;
}

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

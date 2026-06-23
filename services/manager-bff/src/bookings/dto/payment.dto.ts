import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessRefundDto {
  @ApiPropertyOptional({
    description: 'Refund amount (omit for full refund)',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cancelAmount?: number;

  @ApiProperty({
    description: 'Reason for refund',
    example: '고객 요청에 의한 환불',
  })
  @IsNotEmpty({ message: '환불 사유를 입력해 주세요' })
  @IsString()
  cancelReason: string;

  @ApiPropertyOptional({
    description: 'Admin note for refund adjustment',
    example: '정책 금액과 다른 금액으로 환불 처리',
  })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class PaymentFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    example: 'COMPLETED',
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

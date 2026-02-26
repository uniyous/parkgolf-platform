import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PreparePaymentDto {
  @ApiProperty({ description: '결제 금액', example: 50000 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '주문명', example: '파크골프 예약 - 2명' })
  @IsString()
  @IsNotEmpty()
  orderName: string;

  @ApiProperty({ description: '예약 ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  bookingId?: number;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: '토스 paymentKey', example: 'tgen_20240101...' })
  @IsString()
  @IsNotEmpty()
  paymentKey: string;

  @ApiProperty({ description: '주문 ID', example: 'ORDER-20240101-abc123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: '결제 금액', example: 50000 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}

export class ConfirmSplitPaymentDto {
  @ApiProperty({ description: '토스 paymentKey', example: 'tgen_20240101...' })
  @IsString()
  @IsNotEmpty()
  paymentKey: string;

  @ApiProperty({ description: '분할결제 주문 ID', example: 'SPLIT-20240101-abc123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: '결제 금액', example: 15000 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}

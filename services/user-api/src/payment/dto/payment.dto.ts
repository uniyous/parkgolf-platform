import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
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

export class AbandonPaymentDto {
  @ApiProperty({
    description: '실패/취소 사유',
    enum: ['failed', 'cancelled'],
    example: 'failed',
  })
  @IsEnum(['failed', 'cancelled'])
  reason: 'failed' | 'cancelled';

  @ApiProperty({ description: 'Toss 에러 코드', required: false })
  @IsString()
  @IsOptional()
  errorCode?: string;

  @ApiProperty({ description: 'Toss 에러 메시지', required: false })
  @IsString()
  @IsOptional()
  errorMessage?: string;
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

export class SplitParticipantDto {
  @ApiProperty({ description: '참여자 userId', example: 42 })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ description: '참여자 이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: '참여자 이메일', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({ description: '분담 금액', example: 15000 })
  @IsNumber()
  @Min(1)
  amount: number;
}

export class PrepareSplitPaymentDto {
  @ApiProperty({ description: '예약 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({ description: '그룹 예약 ID', required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  bookingGroupId?: number;

  @ApiProperty({ type: [SplitParticipantDto], description: '분할 참여자 목록' })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantDto)
  participants: SplitParticipantDto[];

  @ApiProperty({ description: '만료 시간(분)', example: 5, required: false })
  @IsNumber()
  @IsOptional()
  expirationMinutes?: number;
}

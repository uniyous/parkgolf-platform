import { IsString, IsNumber, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

/**
 * 결제 준비 요청 DTO
 * 클라이언트에서 결제 위젯 초기화 전 호출
 */
export class PreparePaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MaxLength(100)
  orderName: string;

  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  bookingId?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * 결제 승인 요청 DTO
 * 토스페이먼츠 결제 위젯에서 리다이렉트 후 호출
 */
export class ConfirmPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

/**
 * 결제 취소 요청 DTO
 */
export class CancelPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  @MaxLength(200)
  cancelReason: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cancelAmount?: number;

  @IsOptional()
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

/**
 * 부분 취소 요청 DTO
 */
export class PartialCancelPaymentDto extends CancelPaymentDto {
  @IsNumber()
  @Min(1)
  cancelAmount: number;
}

/**
 * 빌링키 발급 요청 DTO
 */
export class IssueBillingKeyDto {
  @IsString()
  authKey: string;

  @IsString()
  customerKey: string;

  @IsNumber()
  userId: number;
}

/**
 * 빌링 결제 요청 DTO
 */
export class BillingPaymentDto {
  @IsString()
  billingKey: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MaxLength(100)
  orderName: string;

  @IsString()
  customerKey: string;

  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  bookingId?: number;
}

/**
 * 결제 조회 필터 DTO
 */
export class GetPaymentsFilterDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  bookingId?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

/**
 * 결제 응답 DTO
 */
export class PaymentResponseDto {
  id: number;
  paymentKey: string | null;
  orderId: string;
  orderName: string;
  amount: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  userId: number;
  bookingId: number | null;
  cardNumber: string | null;
  cardCompany: string | null;
  receiptUrl: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 빌링키 응답 DTO
 */
export class BillingKeyResponseDto {
  id: number;
  billingKey: string;
  customerKey: string;
  cardNumber: string;
  cardCompany: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * 환불 응답 DTO
 */
export class RefundResponseDto {
  id: number;
  paymentId: number;
  transactionKey: string | null;
  cancelAmount: number;
  cancelReason: string;
  status: string;
  canceledAt: Date | null;
  createdAt: Date;
}

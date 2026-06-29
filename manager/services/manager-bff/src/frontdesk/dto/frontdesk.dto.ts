import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsObject, ValidateNested, IsIn, Min } from 'class-validator';

export class SurchargeDto {
  @IsString() label!: string;
  @IsInt() @Min(0) amount!: number;
}

export class PlayerDto {
  @IsOptional() @IsObject() memberContext?: Record<string, unknown>;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SurchargeDto) surcharges?: SurchargeDto[];
}

/** 데스크 부킹 생성 — saga.deskbooking.create 트리거 */
export class CreateDeskBookingDto {
  @IsInt() clubId!: number;
  @IsInt() gameTimeSlotId!: number;
  @IsOptional() @IsIn(['DESK', 'PHONE', 'WALK_IN']) channel?: 'DESK' | 'PHONE' | 'WALK_IN';
  @IsIn(['CASH', 'CARD']) paymentMethod!: 'CASH' | 'CARD';
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlayerDto) players?: PlayerDto[];
  @IsOptional() @IsInt() @Min(1) playerCount?: number;
  @IsOptional() @IsString() idempotencyKey?: string;
}

export class CheckinDto {
  @IsInt() bookingId!: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) bookingPlayerIds?: number[];
}

/** 체크아웃 수납 — 선택 플레이어 묶음(모두/개별/N명분 1인) */
export class PayDto {
  @IsInt() bookingId!: number;
  @IsArray() @IsInt({ each: true }) bookingPlayerIds!: number[];
  @IsIn(['CASH', 'CARD']) method!: 'CASH' | 'CARD';
  @IsOptional() @IsString() idempotencyKey?: string;
}

export class CancelCheckoutDto {
  @IsOptional() @IsString() reason?: string;
}

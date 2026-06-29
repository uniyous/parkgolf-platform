import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsObject, ValidateNested, IsIn, Min } from 'class-validator';
import { PlayerDto } from '../../frontdesk/dto/frontdesk.dto';

/** 요금 견적 — pricing.quote (플레이어별) */
export class QuoteDto {
  @IsInt() clubId!: number;
  @IsInt() gameTimeSlotId!: number;
  @IsOptional() @IsInt() companyId?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlayerDto) players?: PlayerDto[];
  @IsOptional() @IsInt() @Min(1) playerCount?: number;
}

/** 할인 규칙 upsert — pricing.discountRule.upsert */
export class DiscountRuleDto {
  @IsOptional() @IsInt() id?: number;
  @IsIn(['PLATFORM', 'COMPANY', 'CLUB']) scopeLevel!: 'PLATFORM' | 'COMPANY' | 'CLUB';
  @IsOptional() @IsInt() companyId?: number;
  @IsOptional() @IsInt() clubId?: number;
  @IsIn(['PROMOTION', 'EVENT', 'MEMBER', 'MANUAL']) kind!: 'PROMOTION' | 'EVENT' | 'MEMBER' | 'MANUAL';
  @IsString() code!: string;
  @IsString() label!: string;
  @IsIn(['FIXED', 'RATE']) amountType!: 'FIXED' | 'RATE';
  @IsInt() @Min(0) amountValue!: number;
  @IsOptional() @IsIn(['PER_PLAYER', 'PER_BOOKING']) appliesTo?: 'PER_PLAYER' | 'PER_BOOKING';
  @IsOptional() @IsObject() eligibility?: Record<string, unknown>;
  @IsOptional() @IsString() validFrom?: string;
  @IsOptional() @IsString() validTo?: string;
  @IsOptional() @IsBoolean() stackable?: boolean;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsInt() maxDiscountAmount?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TossAdapter, PgProviderError, PgErrorCode, PgCredentials } from '@uniyous/pg-provider';
import { AppException, Errors, ErrorDef } from '../../common/exceptions';

// 기존 import 호환 — Toss 응답 타입은 공유 패키지에서 재노출
// (call site: `import { ..., TossPaymentResponse } from './toss-api.service'`)
export type {
  TossPaymentResponse,
  TossCancelResponse,
  TossBillingKeyResponse,
  TossErrorResponse,
} from '@uniyous/pg-provider';
import type { TossPaymentResponse, TossBillingKeyResponse } from '@uniyous/pg-provider';

/** 정규화 PgErrorCode → billing 에러 카탈로그 (기존 매핑 보존) */
const ERROR_MAP: Record<PgErrorCode, ErrorDef> = {
  ALREADY_PROCESSED: Errors.Payment.ALREADY_CONFIRMED,
  INVALID_CARD: Errors.Payment.INVALID_CARD,
  EXCEED_LIMIT: Errors.Payment.EXCEED_LIMIT,
  INSUFFICIENT_BALANCE: Errors.Payment.INSUFFICIENT_BALANCE,
  NOT_FOUND: Errors.Payment.NOT_FOUND,
  ALREADY_CANCELLED: Errors.Payment.ALREADY_CANCELLED,
  EXCEED_CANCEL_AMOUNT: Errors.Refund.EXCEED_AMOUNT,
  UNAVAILABLE: Errors.External.UNAVAILABLE,
  TIMEOUT: Errors.External.TIMEOUT,
  UNKNOWN: Errors.External.ERROR,
};

/**
 * 토스페이먼츠 API 클라이언트 (UNI-130 [3b]) — 공유 `@uniyous/pg-provider` TossAdapter 위임.
 * billing(마켓)은 본사 단일 Toss → env 자격증명. 메서드 시그니처·반환타입 유지(call site 무변경).
 * 정규화 `PgProviderError` → billing `AppException` 매핑.
 */
@Injectable()
export class TossApiService {
  private readonly logger = new Logger(TossApiService.name);
  private readonly adapter = new TossAdapter();

  constructor(private readonly configService: ConfigService) {
    if (this.creds().testBypass) {
      this.logger.warn(
        `[TossApiService] TEST BYPASS ENABLED — paymentKey 'e2e_test_'는 API 미호출. NODE_ENV=${process.env.NODE_ENV}`,
      );
    }
  }

  private creds(): PgCredentials {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const bypass =
      (this.configService.get<string>('TOSS_TEST_BYPASS') || '').toLowerCase() === 'true' && nodeEnv !== 'production';
    return {
      provider: 'TOSS',
      secretKey: this.configService.get<string>('TOSS_SECRET_KEY') || '',
      baseUrl: this.configService.get<string>('TOSS_API_URL') || undefined,
      testBypass: bypass,
    };
  }

  private rethrow(e: unknown): never {
    if (e instanceof PgProviderError) {
      throw new AppException(ERROR_MAP[e.code] ?? Errors.External.ERROR, e.message);
    }
    throw e;
  }

  async confirmPayment(paymentKey: string, orderId: string, amount: number): Promise<TossPaymentResponse> {
    try {
      const r = await this.adapter.confirm(this.creds(), { paymentKey, orderId, amount });
      this.logger.log(`Payment confirmed: ${paymentKey}`);
      return r.raw as TossPaymentResponse;
    } catch (e) {
      this.rethrow(e);
    }
  }

  async getPayment(paymentKey: string): Promise<TossPaymentResponse> {
    try {
      const r = await this.adapter.get(this.creds(), paymentKey);
      return r.raw as TossPaymentResponse;
    } catch (e) {
      this.rethrow(e);
    }
  }

  async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number,
    refundReceiveAccount?: { bank: string; accountNumber: string; holderName: string },
  ): Promise<TossPaymentResponse> {
    try {
      const r = await this.adapter.cancel(this.creds(), { paymentKey, cancelReason, cancelAmount, refundReceiveAccount });
      this.logger.log(`Payment canceled: ${paymentKey}`);
      return r.raw as TossPaymentResponse;
    } catch (e) {
      this.rethrow(e);
    }
  }

  async issueBillingKey(authKey: string, customerKey: string): Promise<TossBillingKeyResponse> {
    try {
      const r = await this.adapter.issueBillingKey(this.creds(), { authKey, customerKey });
      this.logger.log(`Billing key issued for customer: ${customerKey}`);
      return r.raw as TossBillingKeyResponse;
    } catch (e) {
      this.rethrow(e);
    }
  }

  async billingPayment(
    billingKey: string,
    amount: number,
    orderName: string,
    orderId: string,
    customerKey: string,
  ): Promise<TossPaymentResponse> {
    try {
      const r = await this.adapter.billingPayment(this.creds(), { billingKey, amount, orderName, orderId, customerKey });
      this.logger.log(`Billing payment completed: ${orderId}`);
      return r.raw as TossPaymentResponse;
    } catch (e) {
      this.rethrow(e);
    }
  }
}

// ==============================================
// TossAdapter — PgProviderPort 구현 (UNI-130 [3a])
// billing TossApiService의 엔드포인트·바이패스·에러매핑을 framework 무관 순수 TS(global fetch)로 추출.
// 자격증명은 per-call(PgCredentials) → stateless·멀티테넌트 안전.
// ==============================================
import {
  PgProviderPort,
  PgCredentials,
  PgConfirmInput,
  PgCancelInput,
  PgBillingKeyInput,
  PgBillingPaymentInput,
  PgPaymentResult,
  PgBillingKeyResult,
  PgProviderError,
  PgErrorCode,
} from '../port';
import {
  TossPaymentResponse,
  TossBillingKeyResponse,
  TossErrorResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://api.tosspayments.com/v1';
const DEFAULT_TIMEOUT_MS = 60_000; // Toss 권장 Read Timeout (카드사 승인 지연 대비)

/** Toss 에러코드 → 정규화 PgErrorCode */
function mapTossErrorCode(code: string): PgErrorCode {
  switch (code) {
    case 'ALREADY_PROCESSED_PAYMENT':
      return 'ALREADY_PROCESSED';
    case 'INVALID_CARD_NUMBER':
    case 'INVALID_CARD_EXPIRATION':
    case 'INVALID_STOPPED_CARD':
    case 'RESTRICTED_CARD':
      return 'INVALID_CARD';
    case 'EXCEED_MAX_CARD_INSTALLMENT_PLAN':
    case 'EXCEED_MAX_DAILY_PAYMENT_AMOUNT':
      return 'EXCEED_LIMIT';
    case 'NOT_ENOUGH_BALANCE':
      return 'INSUFFICIENT_BALANCE';
    case 'NOT_FOUND_PAYMENT':
      return 'NOT_FOUND';
    case 'ALREADY_CANCELED_PAYMENT':
      return 'ALREADY_CANCELLED';
    case 'NOT_CANCELABLE_AMOUNT':
    case 'EXCEED_CANCEL_AMOUNT':
      return 'EXCEED_CANCEL_AMOUNT';
    default:
      return 'UNKNOWN';
  }
}

export class TossAdapter implements PgProviderPort {
  readonly provider = 'TOSS' as const;

  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  // ===== PgProviderPort =====

  async confirm(creds: PgCredentials, input: PgConfirmInput): Promise<PgPaymentResult> {
    if (this.isBypass(creds, input.paymentKey)) {
      return this.bypassResult(input.paymentKey, input.orderId, input.amount);
    }
    const data = await this.request<TossPaymentResponse>(creds, 'POST', '/payments/confirm', {
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    });
    return this.toPaymentResult(data);
  }

  async get(creds: PgCredentials, paymentKey: string): Promise<PgPaymentResult> {
    const data = await this.request<TossPaymentResponse>(
      creds,
      'GET',
      `/payments/${encodeURIComponent(paymentKey)}`,
    );
    return this.toPaymentResult(data);
  }

  async cancel(creds: PgCredentials, input: PgCancelInput): Promise<PgPaymentResult> {
    if (this.isBypass(creds, input.paymentKey)) {
      return this.bypassResult(input.paymentKey, 'E2E_CANCEL', input.cancelAmount ?? 0);
    }
    const body: Record<string, unknown> = { cancelReason: input.cancelReason };
    if (input.cancelAmount) body.cancelAmount = input.cancelAmount;
    if (input.refundReceiveAccount) body.refundReceiveAccount = input.refundReceiveAccount;
    const data = await this.request<TossPaymentResponse>(
      creds,
      'POST',
      `/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
      body,
    );
    return this.toPaymentResult(data);
  }

  async issueBillingKey(
    creds: PgCredentials,
    input: PgBillingKeyInput,
  ): Promise<PgBillingKeyResult> {
    const data = await this.request<TossBillingKeyResponse>(
      creds,
      'POST',
      '/billing/authorizations/issue',
      { authKey: input.authKey, customerKey: input.customerKey },
    );
    return {
      provider: this.provider,
      billingKey: data.billingKey,
      customerKey: data.customerKey,
      raw: data,
    };
  }

  async billingPayment(
    creds: PgCredentials,
    input: PgBillingPaymentInput,
  ): Promise<PgPaymentResult> {
    const data = await this.request<TossPaymentResponse>(
      creds,
      'POST',
      `/billing/${encodeURIComponent(input.billingKey)}`,
      {
        amount: input.amount,
        orderName: input.orderName,
        orderId: input.orderId,
        customerKey: input.customerKey,
      },
    );
    return this.toPaymentResult(data);
  }

  // ===== 내부 =====

  private isBypass(creds: PgCredentials, paymentKey: string): boolean {
    return !!creds.testBypass && typeof paymentKey === 'string' && paymentKey.startsWith('e2e_test_');
  }

  private bypassResult(paymentKey: string, orderId: string, amount: number): PgPaymentResult {
    const now = new Date().toISOString();
    const raw: TossPaymentResponse = {
      paymentKey,
      orderId,
      orderName: 'E2E_TEST',
      status: 'DONE',
      requestedAt: now,
      approvedAt: now,
      totalAmount: amount,
      balanceAmount: amount,
      method: '카드',
    };
    return this.toPaymentResult(raw);
  }

  private toPaymentResult(t: TossPaymentResponse): PgPaymentResult {
    return {
      provider: this.provider,
      paymentKey: t.paymentKey,
      orderId: t.orderId,
      status: t.status,
      requestedAt: t.requestedAt,
      approvedAt: t.approvedAt,
      totalAmount: t.totalAmount,
      balanceAmount: t.balanceAmount,
      method: t.method,
      raw: t,
    };
  }

  private authHeader(secretKey: string): string {
    return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
  }

  private async request<T>(
    creds: PgCredentials,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const baseUrl = creds.baseUrl ?? DEFAULT_BASE_URL;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader(creds.secretKey),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = (data ?? {}) as TossErrorResponse;
        throw new PgProviderError(
          mapTossErrorCode(err.code ?? ''),
          this.provider,
          err.code,
          err.message,
        );
      }
      return data as T;
    } catch (e) {
      throw this.normalizeError(e);
    } finally {
      clearTimeout(timer);
    }
  }

  /** 이미 정규화된 PgProviderError는 통과, 네트워크/타임아웃은 정규화 */
  private normalizeError(e: unknown): PgProviderError {
    if (e instanceof PgProviderError) return e;
    const err = e as { name?: string; code?: string };
    // AbortController.abort() → AbortError
    if (err?.name === 'AbortError' || err?.code === 'ETIMEDOUT') {
      return new PgProviderError('TIMEOUT', this.provider, err.code, 'PG 요청 타임아웃');
    }
    // fetch 네트워크 실패(TypeError) / DNS·connection refused
    if (err?.name === 'TypeError' || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
      return new PgProviderError('UNAVAILABLE', this.provider, err.code, 'PG 연결 실패');
    }
    return new PgProviderError('UNKNOWN', this.provider, err?.code, 'PG 알 수 없는 오류');
  }
}

// ==============================================
// @uniyous/pg-provider — PG 어댑터 공통 포트 (UNI-130 [3a])
// 멀티 PG 계약. 자격증명은 호출 인자(per-call)로 주입 → 단일 env(billing)·클럽별(payment) 모두 수용.
// ==============================================

/** 지원 PG 식별자 (provider 추가 시 확장) */
export type PgProviderName = 'TOSS';

/**
 * PG 호출 자격증명 — 호출자가 주입.
 * billing = env(TOSS_SECRET_KEY) 단일 / payment = PgConfigResolver(Club→Company→Platform)+Secret Manager 클럽별.
 */
export interface PgCredentials {
  provider: PgProviderName;
  secretKey: string;
  /** 미지정 시 provider 기본 baseUrl */
  baseUrl?: string;
  /** E2E 우회 (비-prod에서 호출자가 결정). paymentKey가 'e2e_test_' 접두면 API 미호출 */
  testBypass?: boolean;
}

export interface PgConfirmInput {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PgRefundAccount {
  bank: string;
  accountNumber: string;
  holderName: string;
}

export interface PgCancelInput {
  paymentKey: string;
  cancelReason: string;
  /** 부분취소 금액 (미지정 시 전액) */
  cancelAmount?: number;
  /** 가상계좌 등 환불 수취계좌 */
  refundReceiveAccount?: PgRefundAccount;
}

export interface PgBillingKeyInput {
  authKey: string;
  customerKey: string;
}

export interface PgBillingPaymentInput {
  billingKey: string;
  amount: number;
  orderName: string;
  orderId: string;
  customerKey: string;
}

/**
 * provider-neutral 결제 결과. 풍부한 원본(카드·가상계좌·간편결제 상세)은 `raw`에서 consumer가 매핑.
 */
export interface PgPaymentResult {
  provider: PgProviderName;
  paymentKey: string;
  orderId: string;
  status: string;
  requestedAt?: string;
  approvedAt?: string;
  totalAmount: number;
  balanceAmount: number;
  method?: string;
  /** provider 원본 응답 */
  raw: unknown;
}

export interface PgBillingKeyResult {
  provider: PgProviderName;
  billingKey: string;
  customerKey: string;
  raw: unknown;
}

/** 정규화 에러코드 — consumer가 자기 예외체계로 매핑 */
export type PgErrorCode =
  | 'ALREADY_PROCESSED'
  | 'INVALID_CARD'
  | 'EXCEED_LIMIT'
  | 'INSUFFICIENT_BALANCE'
  | 'NOT_FOUND'
  | 'ALREADY_CANCELLED'
  | 'EXCEED_CANCEL_AMOUNT'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

/** PG 어댑터가 throw 하는 정규화 에러. `code`로 분기, `providerCode`는 원본 PG 코드 */
export class PgProviderError extends Error {
  constructor(
    public readonly code: PgErrorCode,
    public readonly provider: PgProviderName,
    public readonly providerCode?: string,
    message?: string,
  ) {
    super(message ?? `${provider} PG error: ${code}${providerCode ? ` (${providerCode})` : ''}`);
    this.name = 'PgProviderError';
  }
}

/** PG 어댑터 포트 — 멀티 PG 공통 계약 */
export interface PgProviderPort {
  readonly provider: PgProviderName;
  /** 결제 승인 */
  confirm(creds: PgCredentials, input: PgConfirmInput): Promise<PgPaymentResult>;
  /** 결제 조회 */
  get(creds: PgCredentials, paymentKey: string): Promise<PgPaymentResult>;
  /** 결제 취소(부분/전액) */
  cancel(creds: PgCredentials, input: PgCancelInput): Promise<PgPaymentResult>;
  /** 빌링키 발급 */
  issueBillingKey(creds: PgCredentials, input: PgBillingKeyInput): Promise<PgBillingKeyResult>;
  /** 빌링(자동) 결제 */
  billingPayment(creds: PgCredentials, input: PgBillingPaymentInput): Promise<PgPaymentResult>;
}

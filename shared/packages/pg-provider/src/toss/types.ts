// ==============================================
// Toss Payments API 응답 타입 (UNI-130 — billing TossApiService에서 이관)
// consumer는 PgPaymentResult.raw 를 이 타입으로 캐스팅해 카드·가상계좌 상세 매핑.
// ==============================================

export interface TossCardInfo {
  number: string;
  company: string;
  installmentPlanMonths: number;
  isInterestFree: boolean;
  approveNo: string;
  cardType: string;
  ownerType: string;
  acquireStatus: string;
  receiptUrl: string;
}

export interface TossVirtualAccountInfo {
  accountNumber: string;
  accountType: string;
  bank: string;
  customerName: string;
  dueDate: string;
  expired: boolean;
  settlementStatus: string;
  refundStatus: string;
}

export interface TossCancelResponse {
  transactionKey: string;
  cancelAmount: number;
  cancelReason: string;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  refundableAmount: number;
  easyPayDiscountAmount: number;
  canceledAt: string;
  receiptKey?: string;
}

export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  totalAmount: number;
  balanceAmount: number;
  method?: string;
  card?: TossCardInfo;
  virtualAccount?: TossVirtualAccountInfo;
  transfer?: {
    bank: string;
    settlementStatus: string;
  };
  mobilePhone?: {
    carrier: string;
    customerMobilePhone: string;
    settlementStatus: string;
  };
  easyPay?: {
    provider: string;
    amount: number;
    discountAmount: number;
  };
  receipt?: {
    url: string;
  };
  cancels?: TossCancelResponse[];
  failure?: {
    code: string;
    message: string;
  };
}

export interface TossBillingKeyResponse {
  billingKey: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  card: {
    number: string;
    company: string;
    cardType: string;
    ownerType: string;
  };
}

export interface TossErrorResponse {
  code: string;
  message: string;
}

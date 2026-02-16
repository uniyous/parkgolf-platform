import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppException, Errors } from '../../common/exceptions';

/**
 * 토스페이먼츠 API 응답 타입
 */
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
  card?: {
    number: string;
    company: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
    receiptUrl: string;
  };
  virtualAccount?: {
    accountNumber: string;
    accountType: string;
    bank: string;
    customerName: string;
    dueDate: string;
    expired: boolean;
    settlementStatus: string;
    refundStatus: string;
  };
  transfer?: {
    bank: string;
    settlementStatus: string;
  };
  mobilePhone?: {
    carrier: string;
    customerMobilePhone: string;
    settlementStatus: string;
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

/**
 * 토스페이먼츠 API 클라이언트 서비스
 */
@Injectable()
export class TossApiService {
  private readonly logger = new Logger(TossApiService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('TOSS_API_URL') || 'https://api.tosspayments.com/v1';
    this.secretKey = this.configService.get<string>('TOSS_SECRET_KEY') || '';
  }

  /**
   * Authorization 헤더 생성
   */
  private getAuthHeader(): string {
    const encoded = Buffer.from(`${this.secretKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * 결제 승인
   * POST /payments/confirm
   */
  async confirmPayment(paymentKey: string, orderId: string, amount: number): Promise<TossPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TossPaymentResponse>(
          `${this.baseUrl}/payments/confirm`,
          { paymentKey, orderId, amount },
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`Payment confirmed: ${paymentKey}`);
      return response.data;
    } catch (error) {
      this.handleTossError(error, '결제 승인');
    }
  }

  /**
   * 결제 조회
   * GET /payments/{paymentKey}
   */
  async getPayment(paymentKey: string): Promise<TossPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TossPaymentResponse>(
          `${this.baseUrl}/payments/${paymentKey}`,
          {
            headers: {
              Authorization: this.getAuthHeader(),
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleTossError(error, '결제 조회');
    }
  }

  /**
   * 결제 취소
   * POST /payments/{paymentKey}/cancel
   */
  async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number,
    refundReceiveAccount?: {
      bank: string;
      accountNumber: string;
      holderName: string;
    },
  ): Promise<TossPaymentResponse> {
    try {
      const body: Record<string, unknown> = { cancelReason };
      if (cancelAmount) {
        body.cancelAmount = cancelAmount;
      }
      if (refundReceiveAccount) {
        body.refundReceiveAccount = refundReceiveAccount;
      }

      const response = await firstValueFrom(
        this.httpService.post<TossPaymentResponse>(
          `${this.baseUrl}/payments/${paymentKey}/cancel`,
          body,
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`Payment canceled: ${paymentKey}`);
      return response.data;
    } catch (error) {
      this.handleTossError(error, '결제 취소');
    }
  }

  /**
   * 빌링키 발급
   * POST /billing/authorizations/issue
   */
  async issueBillingKey(authKey: string, customerKey: string): Promise<TossBillingKeyResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TossBillingKeyResponse>(
          `${this.baseUrl}/billing/authorizations/issue`,
          { authKey, customerKey },
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`Billing key issued for customer: ${customerKey}`);
      return response.data;
    } catch (error) {
      this.handleTossError(error, '빌링키 발급');
    }
  }

  /**
   * 빌링 결제 (자동결제)
   * POST /billing/{billingKey}
   */
  async billingPayment(
    billingKey: string,
    amount: number,
    orderName: string,
    orderId: string,
    customerKey: string,
  ): Promise<TossPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TossPaymentResponse>(
          `${this.baseUrl}/billing/${billingKey}`,
          { amount, orderName, orderId, customerKey },
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`Billing payment completed: ${orderId}`);
      return response.data;
    } catch (error) {
      this.handleTossError(error, '자동결제');
    }
  }

  /**
   * 토스 에러 핸들링
   */
  private handleTossError(error: unknown, operation: string): never {
    const axiosError = error as { response?: { data?: TossErrorResponse; status?: number } };

    if (axiosError.response?.data) {
      const tossError = axiosError.response.data;
      this.logger.error(`Toss API Error [${operation}]: ${tossError.code} - ${tossError.message}`);

      // 토스페이먼츠 에러 코드 매핑
      switch (tossError.code) {
        case 'ALREADY_PROCESSED_PAYMENT':
          throw new AppException(Errors.Payment.ALREADY_CONFIRMED, tossError.message);
        case 'INVALID_CARD_NUMBER':
        case 'INVALID_CARD_EXPIRATION':
          throw new AppException(Errors.Payment.INVALID_CARD, tossError.message);
        case 'EXCEED_MAX_CARD_INSTALLMENT_PLAN':
        case 'EXCEED_MAX_DAILY_PAYMENT_AMOUNT':
          throw new AppException(Errors.Payment.EXCEED_LIMIT, tossError.message);
        case 'NOT_ENOUGH_BALANCE':
          throw new AppException(Errors.Payment.INSUFFICIENT_BALANCE, tossError.message);
        case 'INVALID_STOPPED_CARD':
        case 'RESTRICTED_CARD':
          throw new AppException(Errors.Payment.INVALID_CARD, tossError.message);
        case 'NOT_FOUND_PAYMENT':
          throw new AppException(Errors.Payment.NOT_FOUND, tossError.message);
        case 'ALREADY_CANCELED_PAYMENT':
          throw new AppException(Errors.Payment.ALREADY_CANCELLED, tossError.message);
        case 'NOT_CANCELABLE_AMOUNT':
        case 'EXCEED_CANCEL_AMOUNT':
          throw new AppException(Errors.Refund.EXCEED_AMOUNT, tossError.message);
        default:
          throw new AppException(Errors.External.ERROR, `${operation} 실패: ${tossError.message}`);
      }
    }

    // 네트워크 에러
    const networkError = error as { code?: string };
    if (networkError.code === 'ECONNREFUSED' || networkError.code === 'ENOTFOUND') {
      this.logger.error(`Toss API Connection Error [${operation}]`);
      throw new AppException(Errors.External.UNAVAILABLE);
    }

    if (networkError.code === 'ETIMEDOUT') {
      this.logger.error(`Toss API Timeout [${operation}]`);
      throw new AppException(Errors.External.TIMEOUT);
    }

    this.logger.error(`Unknown Toss API Error [${operation}]`, error);
    throw new AppException(Errors.External.ERROR, `${operation} 중 알 수 없는 오류 발생`);
  }
}

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Prisma, PaymentStatus, PaymentMethod, RefundStatus, OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TossApiService, TossPaymentResponse } from './toss-api.service';
import { AppException, Errors } from '../../common/exceptions';
import {
  PreparePaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  IssueBillingKeyDto,
  BillingPaymentDto,
  GetPaymentsFilterDto,
} from '../dto/payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tossApi: TossApiService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  /**
   * 결제 준비 (orderId 생성)
   */
  async preparePayment(dto: PreparePaymentDto) {
    const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        orderName: dto.orderName,
        amount: dto.amount,
        userId: dto.userId,
        bookingId: dto.bookingId,
        status: PaymentStatus.READY,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    this.logger.log(`Payment prepared: ${orderId} for user ${dto.userId}`);

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      orderName: payment.orderName,
    };
  }

  /**
   * 결제 승인
   */
  async confirmPayment(dto: ConfirmPaymentDto) {
    // 1. 결제 정보 조회 및 검증
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    if (payment.status !== PaymentStatus.READY) {
      throw new AppException(Errors.Payment.INVALID_STATUS, `현재 상태: ${payment.status}`);
    }

    if (payment.amount !== dto.amount) {
      throw new AppException(
        Errors.Payment.AMOUNT_MISMATCH,
        `예상 금액: ${payment.amount}원, 요청 금액: ${dto.amount}원`,
      );
    }

    // 2. 결제 상태를 IN_PROGRESS로 변경
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.IN_PROGRESS },
    });

    try {
      // 3. 토스페이먼츠 승인 API 호출
      const tossResponse = await this.tossApi.confirmPayment(
        dto.paymentKey,
        dto.orderId,
        dto.amount,
      );

      // 4. 결제 정보 업데이트
      const updatedPayment = await this.updatePaymentFromToss(payment.id, tossResponse);

      // 5. Outbox 이벤트 저장 (booking-service에 알림)
      await this.createOutboxEvent('payment.confirmed', {
        paymentId: updatedPayment.id,
        paymentKey: dto.paymentKey,
        orderId: dto.orderId,
        amount: dto.amount,
        bookingId: payment.bookingId,
        userId: payment.userId,
      });

      this.logger.log(`Payment confirmed: ${dto.orderId}`);

      return updatedPayment;
    } catch (error) {
      // 승인 실패 시 상태 롤백
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.ABORTED },
      });
      throw error;
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(dto: CancelPaymentDto) {
    // 1. 결제 정보 조회
    const payment = await this.prisma.payment.findUnique({
      where: { paymentKey: dto.paymentKey },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    if (payment.status === PaymentStatus.CANCELED) {
      throw new AppException(Errors.Payment.ALREADY_CANCELLED);
    }

    if (payment.status !== PaymentStatus.DONE) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '완료된 결제만 취소할 수 있습니다');
    }

    // 2. 부분 취소 금액 검증
    if (dto.cancelAmount) {
      const existingRefunds = await this.prisma.refund.aggregate({
        where: { paymentId: payment.id },
        _sum: { cancelAmount: true },
      });
      const totalRefunded = existingRefunds._sum.cancelAmount || 0;
      const remainingAmount = payment.amount - totalRefunded;

      if (dto.cancelAmount > remainingAmount) {
        throw new AppException(
          Errors.Refund.EXCEED_AMOUNT,
          `환불 가능 금액: ${remainingAmount}원`,
        );
      }
    }

    // 3. 토스페이먼츠 취소 API 호출
    const tossResponse = await this.tossApi.cancelPayment(
      dto.paymentKey,
      dto.cancelReason,
      dto.cancelAmount,
      dto.refundReceiveAccount,
    );

    // 4. 환불 정보 저장
    const latestCancel = tossResponse.cancels?.[tossResponse.cancels.length - 1];
    if (latestCancel) {
      await this.prisma.refund.create({
        data: {
          paymentId: payment.id,
          transactionKey: latestCancel.transactionKey,
          cancelAmount: latestCancel.cancelAmount,
          cancelReason: latestCancel.cancelReason,
          refundStatus: RefundStatus.COMPLETED,
          refundedAt: new Date(latestCancel.canceledAt),
        },
      });
    }

    // 5. 결제 상태 업데이트
    const newStatus = dto.cancelAmount
      ? PaymentStatus.PARTIAL_CANCELED
      : PaymentStatus.CANCELED;

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    // 6. Outbox 이벤트 저장
    await this.createOutboxEvent('payment.canceled', {
      paymentId: payment.id,
      paymentKey: dto.paymentKey,
      cancelAmount: dto.cancelAmount || payment.amount,
      bookingId: payment.bookingId,
      userId: payment.userId,
    });

    this.logger.log(`Payment canceled: ${dto.paymentKey}`);

    return updatedPayment;
  }

  /**
   * 빌링키 발급
   */
  async issueBillingKey(dto: IssueBillingKeyDto) {
    // 기존 빌링키 확인
    const existing = await this.prisma.billingKey.findFirst({
      where: {
        customerKey: dto.customerKey,
        isActive: true,
      },
    });

    if (existing) {
      throw new AppException(Errors.Billing.KEY_ALREADY_EXISTS);
    }

    // 토스페이먼츠 빌링키 발급 API 호출
    const tossResponse = await this.tossApi.issueBillingKey(dto.authKey, dto.customerKey);

    // 빌링키 저장
    const billingKey = await this.prisma.billingKey.create({
      data: {
        billingKey: tossResponse.billingKey,
        customerKey: tossResponse.customerKey,
        userId: dto.userId,
        authenticatedAt: new Date(tossResponse.authenticatedAt),
        cardNumber: tossResponse.card.number,
        cardCompany: tossResponse.card.company,
        cardType: tossResponse.card.cardType,
        isActive: true,
      },
    });

    this.logger.log(`Billing key issued for user ${dto.userId}`);

    return billingKey;
  }

  /**
   * 빌링 결제 (자동결제)
   */
  async billingPayment(dto: BillingPaymentDto) {
    // 빌링키 조회
    const billingKeyRecord = await this.prisma.billingKey.findUnique({
      where: { billingKey: dto.billingKey },
    });

    if (!billingKeyRecord || !billingKeyRecord.isActive) {
      throw new AppException(Errors.Billing.KEY_NOT_FOUND);
    }

    // 결제 준비
    const orderId = `BILLING-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        orderName: dto.orderName,
        amount: dto.amount,
        userId: dto.userId,
        bookingId: dto.bookingId,
        status: PaymentStatus.IN_PROGRESS,
        method: PaymentMethod.CARD,
      },
    });

    try {
      // 토스페이먼츠 빌링 결제 API 호출
      const tossResponse = await this.tossApi.billingPayment(
        dto.billingKey,
        dto.amount,
        dto.orderName,
        orderId,
        dto.customerKey,
      );

      // 결제 정보 업데이트
      const updatedPayment = await this.updatePaymentFromToss(payment.id, tossResponse);

      // Outbox 이벤트 저장
      await this.createOutboxEvent('payment.confirmed', {
        paymentId: updatedPayment.id,
        paymentKey: tossResponse.paymentKey,
        orderId,
        amount: dto.amount,
        bookingId: dto.bookingId,
        userId: dto.userId,
        isBilling: true,
      });

      this.logger.log(`Billing payment completed: ${orderId}`);

      return updatedPayment;
    } catch (error) {
      // 결제 실패 시 상태 업데이트
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.ABORTED },
      });
      throw error;
    }
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentKey },
      include: {
        refunds: true,
      },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    return payment;
  }

  /**
   * 결제 목록 조회
   */
  async getPayments(filter: GetPaymentsFilterDto) {
    const { userId, bookingId, status, startDate, endDate, page = 1, limit = 20 } = filter;

    const where: Prisma.PaymentWhereInput = {};
    if (userId) where.userId = userId;
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { refunds: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      total,
      page,
      limit,
    };
  }

  /**
   * orderId로 결제 조회
   */
  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { refunds: true },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    return payment;
  }

  /**
   * 사용자 빌링키 목록 조회
   */
  async getUserBillingKeys(userId: number) {
    return this.prisma.billingKey.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 빌링키 삭제 (비활성화)
   */
  async deleteBillingKey(billingKey: string, userId: number) {
    const record = await this.prisma.billingKey.findUnique({
      where: { billingKey },
    });

    if (!record || record.userId !== userId) {
      throw new AppException(Errors.Billing.KEY_NOT_FOUND);
    }

    await this.prisma.billingKey.update({
      where: { billingKey },
      data: { isActive: false },
    });

    this.logger.log(`Billing key deleted: ${billingKey}`);

    return { success: true };
  }

  /**
   * 토스 응답으로 결제 정보 업데이트
   */
  private async updatePaymentFromToss(paymentId: number, tossResponse: TossPaymentResponse) {
    const method = this.mapPaymentMethod(tossResponse.method);

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentKey: tossResponse.paymentKey,
        status: this.mapPaymentStatus(tossResponse.status),
        method,
        cardNumber: tossResponse.card?.number,
        cardCompany: tossResponse.card?.company,
        installmentMonths: tossResponse.card?.installmentPlanMonths,
        receiptUrl: tossResponse.receipt?.url || tossResponse.card?.receiptUrl,
        approvedAt: tossResponse.approvedAt ? new Date(tossResponse.approvedAt) : null,
        virtualAccountNumber: tossResponse.virtualAccount?.accountNumber,
        virtualBankCode: tossResponse.virtualAccount?.bank,
        virtualDueDate: tossResponse.virtualAccount?.dueDate
          ? new Date(tossResponse.virtualAccount.dueDate)
          : null,
      },
    });
  }

  /**
   * 결제 수단 매핑
   */
  private mapPaymentMethod(method?: string): PaymentMethod | null {
    if (!method) return null;
    const methodMap: Record<string, PaymentMethod> = {
      '카드': PaymentMethod.CARD,
      '가상계좌': PaymentMethod.VIRTUAL_ACCOUNT,
      '계좌이체': PaymentMethod.TRANSFER,
      '휴대폰': PaymentMethod.MOBILE,
      '간편결제': PaymentMethod.EASY_PAY,
    };
    return methodMap[method] || null;
  }

  /**
   * 결제 상태 매핑
   */
  private mapPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      READY: PaymentStatus.READY,
      IN_PROGRESS: PaymentStatus.IN_PROGRESS,
      WAITING_FOR_DEPOSIT: PaymentStatus.WAITING_FOR_DEPOSIT,
      DONE: PaymentStatus.DONE,
      CANCELED: PaymentStatus.CANCELED,
      PARTIAL_CANCELED: PaymentStatus.PARTIAL_CANCELED,
      ABORTED: PaymentStatus.ABORTED,
      EXPIRED: PaymentStatus.EXPIRED,
    };
    return statusMap[status] || PaymentStatus.READY;
  }

  /**
   * Outbox 이벤트 생성
   */
  private async createOutboxEvent(
    eventType: string,
    payload: Record<string, unknown> & { paymentId: number },
  ) {
    await this.prisma.paymentOutboxEvent.create({
      data: {
        aggregateType: 'Payment',
        aggregateId: String(payload.paymentId),
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: OutboxStatus.PENDING,
      },
    });
  }
}

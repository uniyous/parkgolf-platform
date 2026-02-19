import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from '../service/payment.service';
import { NatsResponse } from '../../common/types/response.types';
import {
  PreparePaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  IssueBillingKeyDto,
  BillingPaymentDto,
  GetPaymentsFilterDto,
} from '../dto/payment.dto';

/**
 * 결제 NATS 컨트롤러
 * NATS 메시지 패턴 핸들러
 */
@Controller()
export class PaymentNatsController {
  private readonly logger = new Logger(PaymentNatsController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 결제 준비
   * 클라이언트에서 결제 위젯 초기화 전 호출
   */
  @MessagePattern('payment.prepare')
  async preparePayment(@Payload() data: PreparePaymentDto) {
    this.logger.log(`Preparing payment for user ${data.userId}`);
    const result = await this.paymentService.preparePayment(data);
    return NatsResponse.success(result);
  }

  /**
   * 결제 승인
   * 토스페이먼츠 결제 위젯에서 리다이렉트 후 호출
   */
  @MessagePattern('payment.confirm')
  async confirmPayment(@Payload() data: ConfirmPaymentDto) {
    this.logger.log(`Confirming payment: ${data.orderId}`);
    const result = await this.paymentService.confirmPayment(data);
    return NatsResponse.success(result);
  }

  /**
   * 결제 취소
   */
  @MessagePattern('payment.cancel')
  async cancelPayment(@Payload() data: CancelPaymentDto) {
    this.logger.log(`Canceling payment: ${data.paymentKey}`);
    const result = await this.paymentService.cancelPayment(data);
    return NatsResponse.success(result);
  }

  /**
   * bookingId 기반 결제 취소 (예약 취소 시 자동 환불)
   */
  @MessagePattern('payment.cancelByBookingId')
  async cancelPaymentByBookingId(@Payload() data: { bookingId: number; cancelReason: string }) {
    this.logger.log(`Canceling payment for bookingId: ${data.bookingId}`);
    const result = await this.paymentService.cancelPaymentByBookingId(data);
    return NatsResponse.success(result);
  }

  /**
   * 결제 조회 (paymentKey)
   */
  @MessagePattern('payment.get')
  async getPayment(@Payload() data: { paymentKey: string }) {
    this.logger.log(`Getting payment: ${data.paymentKey}`);
    const result = await this.paymentService.getPayment(data.paymentKey);
    return NatsResponse.success(result);
  }

  /**
   * 결제 조회 (orderId)
   */
  @MessagePattern('payment.getByOrderId')
  async getPaymentByOrderId(@Payload() data: { orderId: string }) {
    this.logger.log(`Getting payment by orderId: ${data.orderId}`);
    const result = await this.paymentService.getPaymentByOrderId(data.orderId);
    return NatsResponse.success(result);
  }

  /**
   * 결제 목록 조회
   */
  @MessagePattern('payment.list')
  async getPayments(@Payload() data: GetPaymentsFilterDto) {
    this.logger.log(`Listing payments with filters`);
    const result = await this.paymentService.getPayments(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }

  /**
   * 빌링키 발급
   */
  @MessagePattern('billing.issueKey')
  async issueBillingKey(@Payload() data: IssueBillingKeyDto) {
    this.logger.log(`Issuing billing key for user ${data.userId}`);
    const result = await this.paymentService.issueBillingKey(data);
    return NatsResponse.success(result);
  }

  /**
   * 빌링 결제 (자동결제)
   */
  @MessagePattern('billing.pay')
  async billingPayment(@Payload() data: BillingPaymentDto) {
    this.logger.log(`Processing billing payment for user ${data.userId}`);
    const result = await this.paymentService.billingPayment(data);
    return NatsResponse.success(result);
  }

  /**
   * 사용자 빌링키 목록 조회
   */
  @MessagePattern('billing.list')
  async getUserBillingKeys(@Payload() data: { userId: number }) {
    this.logger.log(`Listing billing keys for user ${data.userId}`);
    const result = await this.paymentService.getUserBillingKeys(data.userId);
    return NatsResponse.success(result);
  }

  /**
   * 빌링키 삭제
   */
  @MessagePattern('billing.delete')
  async deleteBillingKey(@Payload() data: { billingKey: string; userId: number }) {
    this.logger.log(`Deleting billing key: ${data.billingKey}`);
    const result = await this.paymentService.deleteBillingKey(data.billingKey, data.userId);
    return NatsResponse.success(result);
  }

  // ============================================
  // Admin Dashboard Stats
  // ============================================

  /**
   * 매출 통계 (대시보드용)
   */
  @MessagePattern('payments.revenueStats')
  async getRevenueStats(@Payload() data: { dateRange: { startDate: string; endDate: string }; token?: string }) {
    this.logger.log('Fetching revenue statistics');
    const result = await this.paymentService.getRevenueStats(data.dateRange);
    return NatsResponse.success(result);
  }

  // ============================================
  // Account Deletion
  // ============================================

  /**
   * 미결제/환불 진행중 확인 (계정 삭제 제한 조건)
   */
  @MessagePattern('payment.userActiveCheck')
  async checkUserActivePayments(@Payload() data: { userId: number }) {
    this.logger.log(`Checking active payments for user ${data.userId}`);
    const result = await this.paymentService.checkUserActivePayments(data.userId);
    return NatsResponse.success(result);
  }

  /**
   * 사용자 삭제 이벤트 - 빌링키 삭제
   */
  @EventPattern('user.deleted')
  async handleUserDeleted(@Payload() data: { userId: number; email: string; deletedAt: string }) {
    this.logger.log(`NATS Event: user.deleted - userId=${data.userId}`);

    try {
      const count = await this.paymentService.deleteUserBillingKeys(data.userId);
      this.logger.log(`Deleted ${count} billing keys for user ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user.deleted event: ${error}`);
    }
  }
}

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { SagaEngineService } from '../engine/saga-engine.service';

@Controller()
export class SagaNatsController {
  private readonly logger = new Logger(SagaNatsController.name);

  constructor(private readonly sagaEngine: SagaEngineService) {}

  // ===== Saga 트리거 (BFF → saga-service) =====

  @MessagePattern('saga.booking.create')
  async handleCreateBooking(@Payload() data: Record<string, unknown>) {
    this.logger.log('[Saga] saga.booking.create received');

    // BFF에서 flat하게 전달되는 필드를 bookingData로 래핑
    const { token, ...bookingFields } = data;
    return this.sagaEngine.startSaga('CREATE_BOOKING', {
      bookingData: bookingFields,
      token,
      idempotencyKey: bookingFields.idempotencyKey,
    }, 'USER', bookingFields.userId as number);
  }

  @MessagePattern('saga.booking.cancel')
  async handleCancelBooking(@Payload() data: {
    id?: number;
    bookingId?: string | number;
    cancelReason?: string;
    reason?: string;
    userId?: number;
    clubId?: number;
    companyId?: number;
    token?: string;
  }) {
    const bookingId = data.id || (typeof data.bookingId === 'string' ? parseInt(data.bookingId, 10) : data.bookingId);
    const cancelReason = data.cancelReason || data.reason;
    this.logger.log(`[Saga] saga.booking.cancel received: bookingId=${bookingId}`);
    return this.sagaEngine.startSaga('CANCEL_BOOKING', {
      bookingId,
      cancelReason,
      clubId: data.clubId,
      companyId: data.companyId,
    }, 'USER', data.userId);
  }

  @MessagePattern('saga.booking.adminRefund')
  async handleAdminRefund(@Payload() data: {
    bookingId: number;
    cancelAmount?: number;
    cancelReason: string;
    adminNote?: string;
    adminId?: number;
    clubId?: number;
    companyId?: number;
  }) {
    this.logger.log(`[Saga] saga.booking.adminRefund received: bookingId=${data.bookingId}`);
    return this.sagaEngine.startSaga('ADMIN_REFUND', {
      bookingId: data.bookingId,
      cancelAmount: data.cancelAmount,
      cancelReason: data.cancelReason,
      adminNote: data.adminNote,
      clubId: data.clubId,
      companyId: data.companyId,
    }, 'ADMIN', data.adminId);
  }

  // ===== 외부 이벤트 수신 → Saga 트리거 =====

  @MessagePattern('booking.paymentConfirmed')
  async handlePaymentConfirmed(@Payload() data: {
    paymentId: number;
    paymentKey: string;
    orderId: string;
    amount: number;
    bookingId: number;
    userId: number;
  }) {
    this.logger.log(`[Saga] booking.paymentConfirmed received: bookingId=${data.bookingId}`);
    return this.sagaEngine.startSaga('PAYMENT_CONFIRMED', {
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.amount,
      userId: data.userId,
    }, 'SYSTEM');
  }

  @MessagePattern('booking.paymentDeposited')
  async handlePaymentDeposited(@Payload() data: {
    paymentId: number;
    paymentKey: string;
    orderId: string;
    amount: number;
    bookingId: number;
    userId: number;
  }) {
    this.logger.log(`[Saga] booking.paymentDeposited received: bookingId=${data.bookingId}`);
    return this.sagaEngine.startSaga('PAYMENT_CONFIRMED', {
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.amount,
      userId: data.userId,
    }, 'SYSTEM');
  }

  // ===== Saga 관리 (admin-api → saga-service) =====

  @MessagePattern('saga.list')
  async handleListSagas(@Payload() data: {
    sagaType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.sagaEngine.listSagas(data);
  }

  @MessagePattern('saga.get')
  async handleGetSaga(@Payload() data: { sagaExecutionId: number }) {
    return this.sagaEngine.getSaga(data.sagaExecutionId);
  }

  @MessagePattern('saga.retry')
  async handleRetrySaga(@Payload() data: { sagaExecutionId: number }) {
    this.logger.log(`[Saga] saga.retry received: id=${data.sagaExecutionId}`);
    return this.sagaEngine.retrySaga(data.sagaExecutionId);
  }

  @MessagePattern('saga.resolve')
  async handleResolveSaga(@Payload() data: { sagaExecutionId: number; adminNote?: string }) {
    this.logger.log(`[Saga] saga.resolve received: id=${data.sagaExecutionId}`);
    return this.sagaEngine.resolveSaga(data.sagaExecutionId, data.adminNote);
  }

  @MessagePattern('saga.stats')
  async handleGetStats(@Payload() data: { startDate?: string; endDate?: string }) {
    const dateRange = data.startDate && data.endDate
      ? { startDate: data.startDate, endDate: data.endDate }
      : undefined;
    return this.sagaEngine.getStats(dateRange);
  }
}

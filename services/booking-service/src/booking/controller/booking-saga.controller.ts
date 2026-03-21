import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { SagaHandlerService } from '../service/saga-handler.service';
import { BookingService } from '../service/booking.service';
import { PaymentCanceledEvent } from '../dto/booking.dto';
import { NatsResponse } from '../../common/types/response.types';

/**
 * Saga 이벤트 핸들러 컨트롤러
 *
 * saga-service 범위 외의 비동기 이벤트 처리:
 * - booking.paymentCanceled: 환불 완료 이력 기록 (payment-service → client.send)
 * - user.deleted: 계정 삭제 시 예약 익명화 (iam-service → client.emit)
 */
@Controller()
export class BookingSagaController {
  private readonly logger = new Logger(BookingSagaController.name);

  constructor(
    private readonly sagaHandler: SagaHandlerService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * 결제 취소(환불) 완료 핸들러
   * payment-service가 client.send()로 호출 → @MessagePattern 필수
   * BookingHistory에 REFUND_COMPLETED 기록 + 환불 알림 발행
   */
  @MessagePattern('booking.paymentCanceled')
  async handlePaymentCanceled(@Payload() data: PaymentCanceledEvent) {
    this.logger.log(`NATS: Received booking.paymentCanceled for booking ${data.bookingId}`);
    this.logger.debug(`NATS: booking.paymentCanceled payload: ${JSON.stringify(data)}`);
    await this.sagaHandler.handlePaymentCanceled(data);
    this.logger.log(`NATS: Successfully processed booking.paymentCanceled for booking ${data.bookingId}`);
    return NatsResponse.success({ processed: true, bookingId: data.bookingId });
  }

  // [REMOVED] slot.released → 발행자 없음 + 캐시 복구는 booking.saga.cancel/adminCancel/paymentTimeout에서 직접 수행

  /**
   * 사용자 삭제 이벤트 핸들러
   * iam-service에서 계정 삭제 시 예약 데이터 익명화
   */
  @EventPattern('user.deleted')
  async handleUserDeleted(@Payload() data: { userId: number; email: string; deletedAt: string }) {
    this.logger.log(`NATS: Received user.deleted event for user ${data.userId}`);

    try {
      const count = await this.bookingService.anonymizeUserBookings(data.userId);
      this.logger.log(`NATS: Anonymized ${count} bookings for user ${data.userId}`);
    } catch (error) {
      this.logger.error(`NATS: Error processing user.deleted: ${error.message}`, error.stack);
    }
  }
}

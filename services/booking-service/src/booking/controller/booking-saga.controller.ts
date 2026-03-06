import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SagaHandlerService } from '../service/saga-handler.service';
import { BookingService } from '../service/booking.service';
import { PaymentCanceledEvent } from '../dto/booking.dto';

/**
 * Saga 이벤트 핸들러 컨트롤러
 *
 * saga-service 범위 외의 비동기 이벤트 처리:
 * - booking.paymentCanceled: 환불 완료 이력 기록
 * - slot.released: 로컬 캐시 슬롯 가용성 복구
 * - user.deleted: 계정 삭제 시 예약 익명화
 *
 * [DEPRECATED → saga-service로 이관]
 * - slot.reserved / slot.reserve.failed → saga-service 오케스트레이션
 * - booking.paymentConfirmed / booking.paymentDeposited → saga-service PAYMENT_CONFIRMED Saga
 */
@Controller()
export class BookingSagaController {
  private readonly logger = new Logger(BookingSagaController.name);

  constructor(
    private readonly sagaHandler: SagaHandlerService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * 결제 취소(환불) 완료 이벤트 핸들러
   * payment-service에서 환불이 완료되면 이 이벤트를 발행함
   * BookingHistory에 REFUND_COMPLETED 기록 + 환불 알림 발행
   */
  @EventPattern('booking.paymentCanceled')
  async handlePaymentCanceled(@Payload() data: PaymentCanceledEvent) {
    this.logger.log(`NATS: Received booking.paymentCanceled for booking ${data.bookingId}`);
    this.logger.debug(`NATS: booking.paymentCanceled payload: ${JSON.stringify(data)}`);

    try {
      await this.sagaHandler.handlePaymentCanceled(data);
      this.logger.log(`NATS: Successfully processed booking.paymentCanceled for booking ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`NATS: Error processing booking.paymentCanceled: ${error.message}`, error.stack);
    }
  }

  /**
   * 슬롯 해제 완료 이벤트 핸들러
   * course-service에서 슬롯 해제가 완료되면 이 이벤트를 발행함
   */
  @EventPattern('slot.released')
  async handleSlotReleased(@Payload() data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
    releasedAt: string;
  }) {
    this.logger.log(`NATS: Received slot.released event for booking ${data.bookingId}`);

    try {
      await this.sagaHandler.handleBookingCancelled({
        bookingId: data.bookingId,
        gameTimeSlotId: data.gameTimeSlotId,
        playerCount: data.playerCount,
      });
      this.logger.log(`NATS: Successfully processed slot.released for booking ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`NATS: Error processing slot.released: ${error.message}`, error.stack);
    }
  }

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

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { SagaHandlerService } from '../service/saga-handler.service';
import { BookingService } from '../service/booking.service';
import { SlotReservedEvent, SlotReserveFailedEvent, PaymentConfirmedEvent, PaymentCanceledEvent } from '../dto/booking.dto';

/**
 * Saga 이벤트 핸들러 컨트롤러
 *
 * course-service / payment-service로부터 수신하는 Saga 이벤트 처리:
 * - slot.reserved: 슬롯 예약 성공 → PENDING → CONFIRMED(현장) / SLOT_RESERVED(카드)
 * - slot.reserve.failed: 슬롯 예약 실패 → PENDING → FAILED
 * - booking.paymentConfirmed: 결제 완료 → SLOT_RESERVED → CONFIRMED
 */
@Controller()
export class BookingSagaController {
  private readonly logger = new Logger(BookingSagaController.name);

  constructor(
    private readonly sagaHandler: SagaHandlerService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * 슬롯 예약 성공 이벤트 핸들러
   * course-service에서 슬롯 예약이 성공하면 이 이벤트를 발행함
   */
  @EventPattern('slot.reserved')
  async handleSlotReserved(@Payload() data: SlotReservedEvent) {
    this.logger.log(`NATS: Received slot.reserved event for booking ${data.bookingId}`);
    this.logger.debug(`NATS: slot.reserved payload: ${JSON.stringify(data)}`);

    try {
      await this.sagaHandler.handleSlotReserved(data);
      this.logger.log(`NATS: Successfully processed slot.reserved for booking ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`NATS: Error processing slot.reserved: ${error.message}`, error.stack);
      // EventPattern은 응답이 없으므로 에러는 로깅만 함
      // 재처리는 별도 메커니즘 (예: Dead Letter Queue) 필요
    }
  }

  /**
   * 슬롯 예약 실패 이벤트 핸들러
   * course-service에서 슬롯 예약이 실패하면 이 이벤트를 발행함
   */
  @EventPattern('slot.reserve.failed')
  async handleSlotReserveFailed(@Payload() data: SlotReserveFailedEvent) {
    this.logger.log(`NATS: Received slot.reserve.failed event for booking ${data.bookingId}`);
    this.logger.debug(`NATS: slot.reserve.failed payload: ${JSON.stringify(data)}`);

    try {
      await this.sagaHandler.handleSlotReserveFailed(data);
      this.logger.log(`NATS: Successfully processed slot.reserve.failed for booking ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`NATS: Error processing slot.reserve.failed: ${error.message}`, error.stack);
    }
  }

  /**
   * [DEPRECATED] booking.paymentConfirmed / booking.paymentDeposited
   * saga-service가 PAYMENT_CONFIRMED Saga로 오케스트레이션
   * saga-service → booking.saga.confirmPayment (BookingSagaStepController)
   */

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

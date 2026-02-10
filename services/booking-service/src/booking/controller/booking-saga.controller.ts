import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { SagaHandlerService } from '../service/saga-handler.service';
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

  constructor(private readonly sagaHandler: SagaHandlerService) {}

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
   * 결제 완료 이벤트 핸들러 (Request-Reply)
   * payment-service에서 결제가 완료되면 이 메시지를 전송함
   * SLOT_RESERVED → CONFIRMED
   */
  @MessagePattern('booking.paymentConfirmed')
  async handlePaymentConfirmed(@Payload() data: PaymentConfirmedEvent) {
    this.logger.log(`NATS: Received booking.paymentConfirmed for booking ${data.bookingId}`);
    this.logger.debug(`NATS: booking.paymentConfirmed payload: ${JSON.stringify(data)}`);

    try {
      const result = await this.sagaHandler.handlePaymentConfirmed(data);
      this.logger.log(`NATS: Successfully processed booking.paymentConfirmed for booking ${data.bookingId}`);
      return result;
    } catch (error) {
      this.logger.error(`NATS: Error processing booking.paymentConfirmed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

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
}

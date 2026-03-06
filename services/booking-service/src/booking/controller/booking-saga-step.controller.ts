import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingSagaStepService } from '../service/booking-saga-step.service';
import { NatsResponse } from '../../common/types/response.types';

/**
 * Saga Step 핸들러 컨트롤러
 *
 * saga-service에서 호출하는 개별 Step 처리:
 * - booking.saga.create: 예약 레코드 생성 (PENDING)
 * - booking.saga.slotReserved: 슬롯 예약 성공 후 상태 업데이트
 * - booking.saga.confirmPayment: 결제 완료 후 예약 확정
 * - booking.saga.cancel: 예약 취소 (CANCELLED)
 * - booking.saga.adminCancel: 관리자 취소 (CANCEL_REQUESTED)
 * - booking.saga.finalizeCancelled: 취소 최종화
 * - booking.saga.markFailed: 예약 실패 처리 (보상)
 * - booking.saga.restoreStatus: 이전 상태 복구 (보상)
 * - booking.saga.paymentTimeout: 결제 타임아웃 처리
 */
@Controller()
export class BookingSagaStepController {
  private readonly logger = new Logger(BookingSagaStepController.name);

  constructor(private readonly sagaStepService: BookingSagaStepService) {}

  @MessagePattern('booking.saga.create')
  async createBookingRecord(@Payload() data: {
    bookingData: Record<string, unknown>;
    token?: string;
  }) {
    this.logger.log(`NATS: booking.saga.create received`);
    const result = await this.sagaStepService.createBookingRecord(data.bookingData);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.slotReserved')
  async handleSlotReserved(@Payload() data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
    paymentMethod?: string;
    reservedAt: string;
  }) {
    this.logger.log(`NATS: booking.saga.slotReserved for booking ${data.bookingId}`);
    const result = await this.sagaStepService.handleSlotReserved(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.confirmPayment')
  async confirmPayment(@Payload() data: {
    bookingId: number;
    paymentId: number;
    paymentKey: string;
    orderId: string;
    amount: number;
    userId: number;
  }) {
    this.logger.log(`NATS: booking.saga.confirmPayment for booking ${data.bookingId}`);
    const result = await this.sagaStepService.confirmPayment(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.cancel')
  async cancelBooking(@Payload() data: {
    bookingId: number;
    cancelReason: string;
    cancelledBy?: number;
    cancelledByType?: string;
  }) {
    this.logger.log(`NATS: booking.saga.cancel for booking ${data.bookingId}`);
    const result = await this.sagaStepService.cancelBooking(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.adminCancel')
  async adminCancel(@Payload() data: {
    bookingId: number;
    cancelReason: string;
    adminNote?: string;
    adminId?: number;
  }) {
    this.logger.log(`NATS: booking.saga.adminCancel for booking ${data.bookingId}`);
    const result = await this.sagaStepService.adminCancel(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.finalizeCancelled')
  async finalizeCancelled(@Payload() data: {
    bookingId: number;
    cancelAmount?: number;
    adminId?: number;
  }) {
    this.logger.log(`NATS: booking.saga.finalizeCancelled for booking ${data.bookingId}`);
    const result = await this.sagaStepService.finalizeCancelled(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.markFailed')
  async markFailed(@Payload() data: {
    bookingData?: Record<string, unknown>;
    bookingId?: number;
    token?: string;
  }) {
    this.logger.log(`NATS: booking.saga.markFailed for booking ${data.bookingId}`);
    const result = await this.sagaStepService.markFailed(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.restoreStatus')
  async restoreStatus(@Payload() data: {
    bookingId: number;
    cancelReason?: string;
    cancelledBy?: number;
    cancelledByType?: string;
  }) {
    this.logger.log(`NATS: booking.saga.restoreStatus for booking ${data.bookingId}`);
    const result = await this.sagaStepService.restoreStatus(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.saga.paymentTimeout')
  async paymentTimeout(@Payload() data: {
    bookingId: number;
    reason: string;
  }) {
    this.logger.log(`NATS: booking.saga.paymentTimeout for booking ${data.bookingId}`);
    const result = await this.sagaStepService.paymentTimeout(data);
    return NatsResponse.success(result);
  }
}

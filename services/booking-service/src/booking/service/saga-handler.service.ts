import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../../prisma/prisma.service';
import { TimeSlotCacheStatus } from '@prisma/client';

/**
 * Saga 이벤트 후속 처리 서비스
 *
 * saga-service 범위 외의 비동기 이벤트에 대한 booking-service 내부 처리:
 * - handlePaymentCanceled: 환불 완료 이력 기록 + 알림
 * - handleBookingCancelled: 로컬 슬롯 캐시 가용성 복구
 *
 * [DEPRECATED → saga-service로 이관된 메서드]
 * - handleSlotReserved, handleSlotReserveFailed → BookingSagaStepService
 * - handlePaymentConfirmed → BookingSagaStepService.confirmPayment()
 * - cleanupTimedOutBookings, cleanupPaymentTimedOutBookings → saga-service 스케줄러
 * - registerCompanyMember → saga-service Step (iam.companyMembers.addByBooking)
 */
@Injectable()
export class SagaHandlerService {
  private readonly logger = new Logger(SagaHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
  ) {}

  /**
   * 결제 취소(환불) 완료 처리
   * payment-service에서 booking.paymentCanceled 이벤트 수신 시 호출
   * BookingHistory에 REFUND_COMPLETED 기록 + 환불 알림 발행
   */
  async handlePaymentCanceled(data: {
    paymentId: number;
    paymentKey: string;
    cancelAmount: number;
    bookingId: number;
    userId: number;
  }): Promise<void> {
    this.logger.log(`[SagaHandler] ========== PAYMENT_CANCELED EVENT RECEIVED ==========`);
    this.logger.log(`[SagaHandler] bookingId=${data.bookingId}, paymentId=${data.paymentId}, cancelAmount=${data.cancelAmount}`);

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: data.bookingId },
      });

      if (!booking) {
        this.logger.error(`[SagaHandler] Booking ${data.bookingId} NOT FOUND for payment.canceled event`);
        return;
      }

      // BookingHistory에 환불 완료 기록
      await this.prisma.bookingHistory.create({
        data: {
          bookingId: data.bookingId,
          action: 'REFUND_COMPLETED',
          userId: booking.userId,
          details: {
            paymentId: data.paymentId,
            paymentKey: data.paymentKey,
            cancelAmount: data.cancelAmount,
            refundedAt: new Date().toISOString(),
          },
        },
      });

      // 환불 완료 알림 발행
      if (this.notificationPublisher) {
        this.notificationPublisher.emit('booking.refundCompleted', {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: booking.userId,
          cancelAmount: data.cancelAmount,
          refundedAt: new Date().toISOString(),
          userEmail: booking.userEmail,
          userName: booking.userName,
        });
        this.logger.log(`[SagaHandler] 'booking.refundCompleted' event emitted for booking ${booking.bookingNumber}`);
      }

      this.logger.log(`[SagaHandler] Booking ${data.bookingId} REFUND_COMPLETED recorded`);
      this.logger.log(`[SagaHandler] ========== PAYMENT_CANCELED EVENT COMPLETED ==========`);
    } catch (error) {
      this.logger.error(`[SagaHandler] FAILED to handle payment.canceled for booking ${data.bookingId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 예약 취소 시 로컬 슬롯 캐시 가용성 복구
   */
  async handleBookingCancelled(data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
  }): Promise<void> {
    this.logger.log(`Handling booking cancelled for booking ${data.bookingId}`);

    try {
      await this.prisma.gameTimeSlotCache.updateMany({
        where: { gameTimeSlotId: data.gameTimeSlotId },
        data: {
          bookedPlayers: { decrement: data.playerCount },
          availablePlayers: { increment: data.playerCount },
          isAvailable: true,
          status: TimeSlotCacheStatus.AVAILABLE,
          lastSyncAt: new Date(),
        },
      });

      this.logger.log(`Slot ${data.gameTimeSlotId} availability restored`);
    } catch (error) {
      this.logger.error(`Failed to restore slot availability: ${error.message}`);
      throw error;
    }
  }
}

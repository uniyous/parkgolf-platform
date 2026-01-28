import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

// Saga 타임아웃 설정
const SAGA_TIMEOUT_MS = 60000; // 1분

/**
 * Saga 상태 전이 처리
 *
 * 상태 흐름:
 *   PENDING → SLOT_RESERVED → CONFIRMED
 *                 ↓               ↓
 *              FAILED         CANCELLED
 */
@Injectable()
export class SagaHandlerService {
  private readonly logger = new Logger(SagaHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
  ) {}

  /**
   * 슬롯 예약 성공 처리
   * course-service에서 slot.reserved 이벤트 수신 시 호출
   */
  async handleSlotReserved(data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
    reservedAt: string;
  }): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`[SagaHandler] ========== SLOT_RESERVED EVENT RECEIVED ==========`);
    this.logger.log(`[SagaHandler] bookingId=${data.bookingId}, gameTimeSlotId=${data.gameTimeSlotId}, playerCount=${data.playerCount}, reservedAt=${data.reservedAt}`);

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: data.bookingId },
      });

      if (!booking) {
        this.logger.error(`[SagaHandler] Booking ${data.bookingId} NOT FOUND for slot.reserved event`);
        return;
      }
      this.logger.log(`[SagaHandler] Current booking status: ${booking.status}, bookingNumber=${booking.bookingNumber}`);

      // PENDING 상태에서만 전이 가능
      if (booking.status !== BookingStatus.PENDING) {
        this.logger.warn(
          `[SagaHandler] Booking ${data.bookingId} is NOT in PENDING status (current: ${booking.status}), IGNORING slot.reserved`
        );
        return;
      }

      // 상태 전이: PENDING → SLOT_RESERVED → CONFIRMED
      // (현재는 결제 프로세스가 없으므로 바로 CONFIRMED로 전이)
      await this.prisma.$transaction(async (prisma) => {
        await prisma.booking.update({
          where: { id: data.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });

        await prisma.bookingHistory.create({
          data: {
            bookingId: data.bookingId,
            action: 'SLOT_RESERVED',
            userId: booking.userId,
            details: {
              gameTimeSlotId: data.gameTimeSlotId,
              playerCount: data.playerCount,
              reservedAt: data.reservedAt,
            },
          },
        });

        await prisma.bookingHistory.create({
          data: {
            bookingId: data.bookingId,
            action: 'CONFIRMED',
            userId: booking.userId,
            details: {
              confirmedAt: new Date().toISOString(),
            },
          },
        });

        // 로컬 캐시 업데이트
        await prisma.gameTimeSlotCache.updateMany({
          where: { gameTimeSlotId: data.gameTimeSlotId },
          data: {
            bookedPlayers: { increment: data.playerCount },
            availablePlayers: { decrement: data.playerCount },
            lastSyncAt: new Date(),
          },
        });
      });

      // 예약 확정 이벤트 발행
      if (this.notificationPublisher) {
        this.notificationPublisher.emit('booking.confirmed', {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: booking.userId,
          gameId: booking.gameId,
          gameName: booking.gameName,
          bookingDate: booking.bookingDate.toISOString(),
          timeSlot: booking.startTime,
          confirmedAt: new Date().toISOString(),
          userEmail: booking.userEmail,
          userName: booking.userName,
        });
        this.logger.log(`[SagaHandler] 'booking.confirmed' event emitted for booking ${booking.bookingNumber}`);
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`[SagaHandler] Booking ${data.bookingId} CONFIRMED successfully in ${elapsed}ms`);
      this.logger.log(`[SagaHandler] ========== SLOT_RESERVED EVENT COMPLETED ==========`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[SagaHandler] FAILED to handle slot.reserved for booking ${data.bookingId} in ${elapsed}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * 슬롯 예약 실패 처리 (보상 트랜잭션)
   * course-service에서 slot.reserve.failed 이벤트 수신 시 호출
   */
  async handleSlotReserveFailed(data: {
    bookingId: number;
    gameTimeSlotId: number;
    reason: string;
  }): Promise<void> {
    this.logger.log(`[SagaHandler] ========== SLOT_RESERVE_FAILED EVENT RECEIVED ==========`);
    this.logger.log(`[SagaHandler] bookingId=${data.bookingId}, gameTimeSlotId=${data.gameTimeSlotId}, reason="${data.reason}"`);

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: data.bookingId },
      });

      if (!booking) {
        this.logger.error(`Booking ${data.bookingId} not found for slot.reserve.failed event`);
        return;
      }

      // PENDING 상태에서만 FAILED로 전이 가능
      if (booking.status !== BookingStatus.PENDING) {
        this.logger.warn(
          `Booking ${data.bookingId} is not in PENDING status (current: ${booking.status}), ignoring failure`
        );
        return;
      }

      await this.prisma.$transaction(async (prisma) => {
        await prisma.booking.update({
          where: { id: data.bookingId },
          data: {
            status: BookingStatus.FAILED,
            sagaFailReason: data.reason,
          },
        });

        await prisma.bookingHistory.create({
          data: {
            bookingId: data.bookingId,
            action: 'SAGA_FAILED',
            userId: booking.userId,
            details: {
              reason: data.reason,
              failedAt: new Date().toISOString(),
            },
          },
        });
      });

      this.logger.log(`Booking ${data.bookingId} marked as FAILED: ${data.reason}`);
    } catch (error) {
      this.logger.error(`Failed to handle slot.reserve.failed for booking ${data.bookingId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 타임아웃된 PENDING 예약 정리
   * 스케줄러에서 주기적으로 호출
   */
  async cleanupTimedOutBookings(): Promise<number> {
    const timeoutThreshold = new Date(Date.now() - SAGA_TIMEOUT_MS);

    try {
      const timedOutBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING,
          createdAt: { lt: timeoutThreshold },
        },
        select: { id: true, bookingNumber: true, userId: true },
      });

      if (timedOutBookings.length === 0) {
        return 0;
      }

      this.logger.warn(`Found ${timedOutBookings.length} timed-out bookings`);

      for (const booking of timedOutBookings) {
        await this.prisma.$transaction(async (prisma) => {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.FAILED,
              sagaFailReason: 'Saga timeout - slot reservation not confirmed in time',
            },
          });

          await prisma.bookingHistory.create({
            data: {
              bookingId: booking.id,
              action: 'SAGA_TIMEOUT',
              userId: booking.userId,
              details: {
                timeoutAt: new Date().toISOString(),
                timeoutMs: SAGA_TIMEOUT_MS,
              },
            },
          });
        });

        this.logger.log(`Booking ${booking.bookingNumber} marked as FAILED due to timeout`);
      }

      return timedOutBookings.length;
    } catch (error) {
      this.logger.error(`Failed to cleanup timed-out bookings: ${error.message}`);
      throw error;
    }
  }

  /**
   * 예약 취소 시 슬롯 해제 처리
   */
  async handleBookingCancelled(data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
  }): Promise<void> {
    this.logger.log(`Handling booking cancelled for booking ${data.bookingId}`);

    try {
      // 로컬 캐시에서 슬롯 가용성 복구
      await this.prisma.gameTimeSlotCache.updateMany({
        where: { gameTimeSlotId: data.gameTimeSlotId },
        data: {
          bookedPlayers: { decrement: data.playerCount },
          availablePlayers: { increment: data.playerCount },
          isAvailable: true,
          status: 'AVAILABLE',
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

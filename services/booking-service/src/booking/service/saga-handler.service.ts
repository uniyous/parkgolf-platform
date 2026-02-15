import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, OutboxStatus, TimeSlotCacheStatus } from '@prisma/client';

// Saga 타임아웃 설정
const SAGA_TIMEOUT_MS = 60000; // 1분
const PAYMENT_TIMEOUT_MS = 600000; // 10분 (결제 대기 타임아웃)

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
    @Optional() @Inject('COURSE_SERVICE') private readonly courseService?: ClientProxy,
    @Optional() @Inject('IAM_SERVICE') private readonly iamService?: ClientProxy,
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

      const isOnsitePayment = !booking.paymentMethod || booking.paymentMethod === 'onsite';

      if (isOnsitePayment) {
        // 현장결제: PENDING → CONFIRMED (바로 확정)
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

        // CompanyMember 자동 등록
        await this.registerCompanyMember(booking.clubId, booking.userId);

        const elapsed = Date.now() - startTime;
        this.logger.log(`[SagaHandler] Booking ${data.bookingId} CONFIRMED (onsite) in ${elapsed}ms`);
      } else {
        // 카드결제: PENDING → SLOT_RESERVED (결제 대기)
        await this.prisma.$transaction(async (prisma) => {
          await prisma.booking.update({
            where: { id: data.bookingId },
            data: { status: BookingStatus.SLOT_RESERVED },
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
                paymentMethod: booking.paymentMethod,
                awaitingPayment: true,
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

        const elapsed = Date.now() - startTime;
        this.logger.log(`[SagaHandler] Booking ${data.bookingId} SLOT_RESERVED (awaiting payment) in ${elapsed}ms`);
      }

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
   * 결제 완료 처리
   * payment-service에서 booking.paymentConfirmed 이벤트 수신 시 호출
   * SLOT_RESERVED → CONFIRMED
   */
  async handlePaymentConfirmed(data: {
    paymentId: number;
    paymentKey: string;
    orderId: string;
    amount: number;
    bookingId: number;
    userId: number;
  }): Promise<{ success: boolean }> {
    const startTime = Date.now();
    this.logger.log(`[SagaHandler] ========== PAYMENT_CONFIRMED EVENT RECEIVED ==========`);
    this.logger.log(`[SagaHandler] bookingId=${data.bookingId}, paymentId=${data.paymentId}, orderId=${data.orderId}, amount=${data.amount}`);

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: data.bookingId },
      });

      if (!booking) {
        this.logger.error(`[SagaHandler] Booking ${data.bookingId} NOT FOUND for payment.confirmed event`);
        return { success: false };
      }

      // SLOT_RESERVED 상태에서만 CONFIRMED로 전이
      if (booking.status !== BookingStatus.SLOT_RESERVED) {
        this.logger.warn(
          `[SagaHandler] Booking ${data.bookingId} is NOT in SLOT_RESERVED status (current: ${booking.status}), IGNORING payment.confirmed`
        );
        return { success: false };
      }

      await this.prisma.$transaction(async (prisma) => {
        await prisma.booking.update({
          where: { id: data.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });

        await prisma.bookingHistory.create({
          data: {
            bookingId: data.bookingId,
            action: 'PAYMENT_CONFIRMED',
            userId: booking.userId,
            details: {
              paymentId: data.paymentId,
              paymentKey: data.paymentKey,
              orderId: data.orderId,
              amount: data.amount,
              confirmedAt: new Date().toISOString(),
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
              paymentMethod: booking.paymentMethod,
            },
          },
        });
      });

      // 예약 확정 이벤트 발행 (알림용)
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
          paymentMethod: booking.paymentMethod,
        });
        this.logger.log(`[SagaHandler] 'booking.confirmed' event emitted for booking ${booking.bookingNumber}`);
      }

      // CompanyMember 자동 등록
      await this.registerCompanyMember(booking.clubId, booking.userId);

      const elapsed = Date.now() - startTime;
      this.logger.log(`[SagaHandler] Booking ${data.bookingId} CONFIRMED (payment completed) in ${elapsed}ms`);
      this.logger.log(`[SagaHandler] ========== PAYMENT_CONFIRMED EVENT COMPLETED ==========`);

      return { success: true };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[SagaHandler] FAILED to handle payment.confirmed for booking ${data.bookingId} in ${elapsed}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * 결제 타임아웃된 SLOT_RESERVED 예약 정리
   * 스케줄러에서 주기적으로 호출
   * SLOT_RESERVED 상태에서 10분 이상 결제되지 않은 예약을 FAILED 처리하고 슬롯 해제
   */
  async cleanupPaymentTimedOutBookings(): Promise<number> {
    const timeoutThreshold = new Date(Date.now() - PAYMENT_TIMEOUT_MS);

    try {
      const timedOutBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.SLOT_RESERVED,
          updatedAt: { lt: timeoutThreshold },
        },
        select: {
          id: true,
          bookingNumber: true,
          userId: true,
          gameTimeSlotId: true,
          playerCount: true,
        },
      });

      if (timedOutBookings.length === 0) {
        return 0;
      }

      this.logger.warn(`[SagaHandler] Found ${timedOutBookings.length} payment-timed-out SLOT_RESERVED bookings`);

      for (const booking of timedOutBookings) {
        await this.prisma.$transaction(async (prisma) => {
          // 예약 상태 FAILED로 변경
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.FAILED,
              sagaFailReason: 'Payment timeout - payment not completed within 10 minutes',
            },
          });

          await prisma.bookingHistory.create({
            data: {
              bookingId: booking.id,
              action: 'PAYMENT_TIMEOUT',
              userId: booking.userId,
              details: {
                timeoutAt: new Date().toISOString(),
                timeoutMs: PAYMENT_TIMEOUT_MS,
              },
            },
          });

          // Outbox 이벤트: 슬롯 해제 요청 (course-service에서 처리)
          await prisma.outboxEvent.create({
            data: {
              aggregateType: 'Booking',
              aggregateId: String(booking.id),
              eventType: 'slot.release',
              payload: {
                bookingId: booking.id,
                gameTimeSlotId: booking.gameTimeSlotId,
                playerCount: booking.playerCount,
                reason: 'Payment timeout',
                requestedAt: new Date().toISOString(),
              } as any,
              status: OutboxStatus.PENDING,
            },
          });
        });

        this.logger.log(`[SagaHandler] Booking ${booking.bookingNumber} marked as FAILED due to payment timeout, slot release requested`);
      }

      return timedOutBookings.length;
    } catch (error) {
      this.logger.error(`[SagaHandler] Failed to cleanup payment-timed-out bookings: ${error.message}`);
      throw error;
    }
  }

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
   * 예약 확정 시 CompanyMember 자동 등록
   * clubId → companyId 조회 → iam.companyMembers.addByBooking 호출
   */
  private async registerCompanyMember(clubId: number | null, userId: number | null): Promise<void> {
    if (!clubId || !userId || !this.courseService || !this.iamService) return;

    try {
      const clubResponse = await firstValueFrom(
        this.courseService.send('club.findOne', { id: clubId }),
      );
      const companyId = clubResponse?.data?.companyId;
      if (!companyId) return;

      await firstValueFrom(
        this.iamService.send('iam.companyMembers.addByBooking', { companyId, userId }),
      );
      this.logger.log(`CompanyMember registered: companyId=${companyId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to register CompanyMember: clubId=${clubId}, userId=${userId}`, error?.message);
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

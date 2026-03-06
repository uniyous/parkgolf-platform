import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, TimeSlotCacheStatus, OutboxStatus, ParticipantRole, ParticipantStatus } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

/**
 * Saga Step 원자 연산 서비스
 *
 * saga-service가 호출하는 개별 Step을 처리한다.
 * 각 메서드는 booking DB만 변경하고, 다른 서비스 호출이나 이벤트 발행을 하지 않는다.
 * (알림/슬롯/결제 등의 연쇄 호출은 saga-service가 오케스트레이션)
 */
@Injectable()
export class BookingSagaStepService {
  private readonly logger = new Logger(BookingSagaStepService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 예약 레코드 생성 (PENDING 상태)
   * Outbox 이벤트를 생성하지 않음 — 슬롯 예약은 saga-service가 직접 호출
   */
  async createBookingRecord(bookingData: Record<string, unknown>) {
    const dto = bookingData as {
      idempotencyKey: string;
      userId: number;
      gameTimeSlotId: number;
      playerCount: number;
      paymentMethod?: string;
      specialRequests?: string;
      userEmail?: string;
      userName?: string;
      userPhone?: string;
      groupId?: string;
      teamNumber?: number;
      teamSelectionId?: number;
      gameId?: number;
      bookingDate?: string;
    };

    // 멱등성 체크
    if (dto.idempotencyKey) {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key: dto.idempotencyKey },
      });
      if (existing) {
        const booking = await this.prisma.booking.findUnique({
          where: { id: parseInt(existing.aggregateId) },
        });
        if (booking) {
          return this.toSagaResponse(booking);
        }
      }
    }

    // 슬롯 캐시에서 게임 정보 조회
    const slotCache = await this.prisma.gameTimeSlotCache.findUnique({
      where: { gameTimeSlotId: dto.gameTimeSlotId },
    });

    if (!slotCache) {
      throw new AppException(Errors.Course.TIMESLOT_NOT_FOUND);
    }

    if (!slotCache.isAvailable || slotCache.availablePlayers < dto.playerCount) {
      throw new AppException(Errors.Booking.INSUFFICIENT_CAPACITY,
        `예약 가능 인원이 부족합니다. 가능: ${slotCache.availablePlayers}, 요청: ${dto.playerCount}`);
    }

    const gameInfo = await this.prisma.gameCache.findUnique({
      where: { gameId: slotCache.gameId },
    });

    if (!gameInfo) {
      throw new AppException(Errors.Course.GAME_NOT_FOUND);
    }

    const pricePerPerson = Number(slotCache.price);
    const totalAmount = pricePerPerson * dto.playerCount;
    const serviceFee = Math.floor(totalAmount * 0.03);
    const totalPrice = totalAmount + serviceFee;

    const bookingNumber = this.generateBookingNumber();
    const idempotencyKeyExpiry = new Date();
    idempotencyKeyExpiry.setHours(idempotencyKeyExpiry.getHours() + 24);

    const booking = await this.prisma.$transaction(async (prisma) => {
      const newBooking = await prisma.booking.create({
        data: {
          gameTimeSlotId: dto.gameTimeSlotId,
          gameId: slotCache.gameId,
          gameName: slotCache.gameName,
          gameCode: slotCache.gameCode,
          frontNineCourseId: gameInfo.frontNineCourseId,
          frontNineCourseName: gameInfo.frontNineCourseName,
          backNineCourseId: gameInfo.backNineCourseId,
          backNineCourseName: gameInfo.backNineCourseName,
          bookingDate: slotCache.date,
          startTime: slotCache.startTime,
          endTime: slotCache.endTime,
          clubId: slotCache.clubId,
          clubName: slotCache.clubName,
          userId: dto.userId,
          playerCount: dto.playerCount,
          pricePerPerson,
          serviceFee,
          totalPrice,
          status: BookingStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          specialRequests: dto.specialRequests,
          bookingNumber,
          idempotencyKey: dto.idempotencyKey,
          userEmail: dto.userEmail,
          userName: dto.userName,
          userPhone: dto.userPhone,
          groupId: dto.groupId,
          teamNumber: dto.teamNumber,
          teamSelectionId: dto.teamSelectionId,
        },
      });

      if (dto.idempotencyKey) {
        await prisma.idempotencyKey.create({
          data: {
            key: dto.idempotencyKey,
            aggregateType: 'Booking',
            aggregateId: String(newBooking.id),
            expiresAt: idempotencyKeyExpiry,
          },
        });
      }

      await prisma.bookingHistory.create({
        data: {
          bookingId: newBooking.id,
          action: 'SAGA_STARTED',
          userId: dto.userId,
          details: {
            playerCount: dto.playerCount,
            totalPrice: totalPrice.toString(),
            paymentMethod: dto.paymentMethod,
            gameName: slotCache.gameName,
            gameTimeSlotId: dto.gameTimeSlotId,
            idempotencyKey: dto.idempotencyKey,
            orchestrator: 'saga-service',
          },
        },
      });

      return newBooking;
    });

    this.logger.log(`Booking ${booking.bookingNumber} created (PENDING) via saga-service`);
    return this.toSagaResponse(booking);
  }

  /**
   * 슬롯 예약 성공 후 상태 업데이트
   * 현장결제: PENDING → CONFIRMED, 카드결제: PENDING → SLOT_RESERVED
   */
  async handleSlotReserved(data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
    paymentMethod?: string;
    reservedAt: string;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    if (booking.status !== BookingStatus.PENDING) {
      this.logger.warn(`Booking ${data.bookingId} is ${booking.status}, expected PENDING`);
      return { status: booking.status, bookingId: booking.id };
    }

    const isOnsitePayment = !booking.paymentMethod || booking.paymentMethod === 'onsite';
    const newStatus = isOnsitePayment ? BookingStatus.CONFIRMED : BookingStatus.SLOT_RESERVED;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { status: newStatus },
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
          },
        },
      });

      if (isOnsitePayment) {
        await prisma.bookingHistory.create({
          data: {
            bookingId: data.bookingId,
            action: 'CONFIRMED',
            userId: booking.userId,
            details: { confirmedAt: new Date().toISOString() },
          },
        });

        // 그룹 예약: BookingParticipant 자동 생성
        if (booking.teamSelectionId && booking.teamNumber) {
          await this.createParticipantsFromTeamSelection(
            prisma, data.bookingId, booking.teamSelectionId, booking.teamNumber, Number(booking.pricePerPerson),
          );
        }
      }

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

    this.logger.log(`Booking ${data.bookingId} → ${newStatus} via saga-service`);
    return { status: newStatus, bookingId: booking.id };
  }

  /**
   * 결제 완료 후 예약 확정
   * SLOT_RESERVED → CONFIRMED
   */
  async confirmPayment(data: {
    bookingId: number;
    paymentId: number;
    paymentKey: string;
    orderId: string;
    amount: number;
    userId: number;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    if (booking.status !== BookingStatus.SLOT_RESERVED) {
      // FAILED 상태에서 결제 도착 → 자동 환불 필요
      if (booking.status === BookingStatus.FAILED) {
        await this.prisma.$transaction(async (prisma) => {
          await prisma.bookingHistory.create({
            data: {
              bookingId: data.bookingId,
              action: 'AUTO_REFUND_REQUESTED',
              userId: booking.userId,
              details: {
                reason: 'Payment arrived after booking timeout',
                paymentId: data.paymentId,
                paymentKey: data.paymentKey,
                amount: data.amount,
                requestedAt: new Date().toISOString(),
              },
            },
          });

          await prisma.outboxEvent.create({
            data: {
              aggregateType: 'Booking',
              aggregateId: String(data.bookingId),
              eventType: 'payment.cancelByBookingId',
              payload: {
                bookingId: data.bookingId,
                cancelReason: 'Auto-refund: payment arrived after booking timeout',
              } as any,
              status: OutboxStatus.PENDING,
            },
          });
        });
      }

      this.logger.warn(`Booking ${data.bookingId} is ${booking.status}, expected SLOT_RESERVED`);
      return {
        bookingId: booking.id,
        status: booking.status,
        bookingNumber: booking.bookingNumber,
      };
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

      if (booking.teamSelectionId && booking.teamNumber) {
        await this.createParticipantsFromTeamSelection(
          prisma, data.bookingId, booking.teamSelectionId, booking.teamNumber, Number(booking.pricePerPerson),
        );
      }
    });

    this.logger.log(`Booking ${data.bookingId} CONFIRMED (payment) via saga-service`);
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      gameName: booking.gameName,
      bookingDate: booking.bookingDate?.toISOString(),
      startTime: booking.startTime,
      clubId: booking.clubId,
      userEmail: booking.userEmail,
      userName: booking.userName,
      paymentMethod: booking.paymentMethod,
    };
  }

  /**
   * 예약 취소 (CANCELLED)
   * 슬롯 해제/결제 취소는 saga-service가 별도 Step으로 처리
   */
  async cancelBooking(data: {
    bookingId: number;
    cancelReason: string;
    cancelledBy?: number;
    cancelledByType?: string;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppException(Errors.Booking.ALREADY_CANCELLED);
    }

    const previousStatus = booking.status;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId: data.bookingId,
          action: 'CANCELLED',
          userId: booking.userId,
          details: {
            reason: data.cancelReason,
            previousStatus,
            cancelledBy: data.cancelledBy,
            cancelledByType: data.cancelledByType,
          },
        },
      });
    });

    this.logger.log(`Booking ${data.bookingId} CANCELLED (${previousStatus} → CANCELLED) via saga-service`);
    return {
      previousStatus,
      gameTimeSlotId: booking.gameTimeSlotId,
      playerCount: booking.playerCount,
      paymentMethod: booking.paymentMethod,
      userId: booking.userId,
      bookingNumber: booking.bookingNumber,
      userEmail: booking.userEmail,
      userName: booking.userName,
    };
  }

  /**
   * 관리자 취소 (CONFIRMED → CANCELLED)
   * 환불/슬롯 해제 전에 예약 상태를 먼저 CANCELLED로 변경
   */
  async adminCancel(data: {
    bookingId: number;
    cancelReason: string;
    adminNote?: string;
    adminId?: number;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    const previousStatus = booking.status;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId: data.bookingId,
          action: 'ADMIN_CANCEL_REQUESTED',
          userId: booking.userId,
          details: {
            reason: data.cancelReason,
            adminNote: data.adminNote,
            adminId: data.adminId,
            previousStatus,
          },
        },
      });
    });

    this.logger.log(`Booking ${data.bookingId} CANCELLED by admin via saga-service`);
    return {
      previousStatus,
      gameTimeSlotId: booking.gameTimeSlotId,
      playerCount: booking.playerCount,
      userId: booking.userId,
      bookingNumber: booking.bookingNumber,
      userEmail: booking.userEmail,
      userName: booking.userName,
    };
  }

  /**
   * 취소 최종화 (환불/슬롯 해제 후 이력 기록)
   */
  async finalizeCancelled(data: {
    bookingId: number;
    cancelAmount?: number;
    adminId?: number;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { userId: true },
    });

    await this.prisma.bookingHistory.create({
      data: {
        bookingId: data.bookingId,
        action: 'REFUND_FINALIZED',
        userId: booking?.userId || 0,
        details: {
          finalizedAt: new Date().toISOString(),
          cancelAmount: data.cancelAmount,
          adminId: data.adminId,
          orchestrator: 'saga-service',
        },
      },
    });

    this.logger.log(`Booking ${data.bookingId} refund finalized via saga-service`);
    return { bookingId: data.bookingId, status: 'CANCELLED' };
  }

  /**
   * 예약 실패 처리 (보상 트랜잭션)
   */
  async markFailed(data: {
    bookingData?: Record<string, unknown>;
    bookingId?: number;
    token?: string;
  }) {
    const bookingId = data.bookingId || (data.bookingData?.bookingId as number);
    if (!bookingId) {
      this.logger.warn('booking.saga.markFailed called without bookingId');
      return { status: 'SKIPPED' };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });

    await this.prisma.$transaction(async (prisma) => {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.FAILED,
          sagaFailReason: 'Saga compensation — booking creation rolled back',
        },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId,
          action: 'SAGA_FAILED',
          userId: booking?.userId || 0,
          details: {
            reason: 'Compensation rollback',
            failedAt: new Date().toISOString(),
            orchestrator: 'saga-service',
          },
        },
      });
    });

    this.logger.log(`Booking ${bookingId} marked FAILED (compensation) via saga-service`);
    return { bookingId, status: 'FAILED' };
  }

  /**
   * 이전 상태 복구 (보상 트랜잭션)
   * cancel/adminCancel 보상 시 원래 상태로 복원
   */
  async restoreStatus(data: {
    bookingId: number;
    cancelReason?: string;
    cancelledBy?: number;
    cancelledByType?: string;
  }) {
    // 최근 CANCELLED/CANCEL_REQUESTED 히스토리에서 previousStatus 조회
    const history = await this.prisma.bookingHistory.findFirst({
      where: {
        bookingId: data.bookingId,
        action: { in: ['CANCELLED', 'CANCEL_REQUESTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const previousStatus = (history?.details as Record<string, unknown>)?.previousStatus as string;
    const restoreStatus = previousStatus || 'CONFIRMED';

    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { userId: true },
    });

    await this.prisma.$transaction(async (prisma) => {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { status: restoreStatus as BookingStatus },
      });

      await prisma.bookingHistory.create({
        data: {
          bookingId: data.bookingId,
          action: 'STATUS_RESTORED',
          userId: booking?.userId || 0,
          details: {
            restoredTo: restoreStatus,
            reason: 'Saga compensation rollback',
            restoredAt: new Date().toISOString(),
            orchestrator: 'saga-service',
          },
        },
      });
    });

    this.logger.log(`Booking ${data.bookingId} restored to ${restoreStatus} (compensation) via saga-service`);
    return { bookingId: data.bookingId, status: restoreStatus };
  }

  /**
   * 결제 타임아웃 처리
   * SLOT_RESERVED → FAILED
   */
  async paymentTimeout(data: {
    bookingId: number;
    reason: string;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
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
          action: 'PAYMENT_TIMEOUT',
          userId: booking.userId,
          details: {
            reason: data.reason,
            timeoutAt: new Date().toISOString(),
            orchestrator: 'saga-service',
          },
        },
      });
    });

    this.logger.log(`Booking ${data.bookingId} FAILED (payment timeout) via saga-service`);
    return {
      gameTimeSlotId: booking.gameTimeSlotId,
      playerCount: booking.playerCount,
      userId: booking.userId,
      bookingNumber: booking.bookingNumber,
    };
  }

  private toSagaResponse(booking: Record<string, unknown>) {
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      gameTimeSlotId: booking.gameTimeSlotId,
      playerCount: booking.playerCount,
      paymentMethod: booking.paymentMethod,
      clubId: booking.clubId,
      userId: booking.userId,
      gameName: booking.gameName,
      bookingDate: booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString()
        : booking.bookingDate,
      startTime: booking.startTime,
      userEmail: booking.userEmail,
      userName: booking.userName,
    };
  }

  private generateBookingNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BK${dateStr}${random}`;
  }

  private async createParticipantsFromTeamSelection(
    prisma: unknown,
    bookingId: number,
    teamSelectionId: number,
    teamNumber: number,
    pricePerPerson: number,
  ): Promise<void> {
    const tx = prisma as {
      teamSelectionMember: { findMany: (args: unknown) => Promise<Array<{ userId: number; userName: string; userEmail: string; role: string }>> };
      bookingParticipant: { upsert: (args: unknown) => Promise<unknown> };
    };

    const members = await tx.teamSelectionMember.findMany({
      where: { teamSelectionId, teamNumber },
    });

    if (members.length === 0) return;

    for (const member of members) {
      await tx.bookingParticipant.upsert({
        where: { bookingId_userId: { bookingId, userId: member.userId } },
        update: {},
        create: {
          bookingId,
          userId: member.userId,
          userName: member.userName,
          userEmail: member.userEmail,
          role: member.role as ParticipantRole,
          status: ParticipantStatus.PENDING,
          amount: pricePerPerson,
        },
      });
    }

    this.logger.log(`Created ${members.length} BookingParticipants for booking ${bookingId}`);
  }
}

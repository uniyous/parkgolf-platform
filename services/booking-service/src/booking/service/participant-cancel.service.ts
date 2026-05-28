import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
import { BookingStatus, ParticipantStatus, TimeSlotCacheStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';
import { NATS_TIMEOUTS } from '../../common/constants';

export interface CancelParticipantInput {
  bookingId: number;
  userId: number;
  reason?: string;
}

export interface CancelParticipantResult {
  bookingId: number;
  userId: number;
  previousStatus: ParticipantStatus;
  newStatus: ParticipantStatus;
  refundedAmount: number;
  bookingCancelled: boolean;
  remainingParticipants: number;
}

/**
 * 더치페이 본인 자리 취소 SSOT — AGENT_PAY.md §11.4
 *
 * 단일 결제(현장·카드)의 전체 booking 취소는 saga.booking.cancel이 담당.
 * 본 서비스는 더치페이 참여자가 마이페이지에서 본인 자리만 취소할 때 호출된다.
 *
 * 처리 순서:
 *   1) BookingParticipant 조회·검증
 *   2) PAID → payment.refundSplit (트랜잭션 밖, Toss 환불) → REFUNDED
 *      PENDING → 환불 불필요 → CANCELLED
 *   3) 트랜잭션: participant 상태 + 슬롯 1자리 release + history
 *   4) 모든 participant 취소 시 Booking.status = CANCELLED
 */
@Injectable()
export class ParticipantCancelService {
  private readonly logger = new Logger(ParticipantCancelService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('PAYMENT_SERVICE') private readonly paymentClient?: ClientProxy,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notifyClient?: ClientProxy,
  ) {}

  async cancelParticipant(input: CancelParticipantInput): Promise<CancelParticipantResult> {
    const { bookingId, userId, reason } = input;

    const participant = await this.prisma.bookingParticipant.findUnique({
      where: { bookingId_userId: { bookingId, userId } },
      include: { booking: true },
    });

    if (!participant) {
      throw new AppException(Errors.Group.PARTICIPANT_NOT_FOUND);
    }

    if (
      participant.status === ParticipantStatus.CANCELLED ||
      participant.status === ParticipantStatus.REFUNDED
    ) {
      throw new AppException(Errors.Booking.ALREADY_CANCELLED);
    }

    const booking = participant.booking;
    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppException(Errors.Booking.ALREADY_CANCELLED);
    }

    // PAID이면 payment-service에 환불 위임. 실패 시 throw → participant 상태 무변경.
    // 정책: AGENT_PAY.md §11.5 Phase 1 — 운영 알림 (notify-service emit) 후 에러 전파.
    let refundedAmount = 0;
    let nextStatus: ParticipantStatus = ParticipantStatus.CANCELLED;

    if (participant.status === ParticipantStatus.PAID) {
      if (!this.paymentClient) {
        throw new AppException(
          Errors.Booking.INVALID_STATUS,
          'PAYMENT_SERVICE client not configured',
        );
      }

      const refundResult = await firstValueFrom(
        this.paymentClient
          .send('payment.refundSplit', {
            bookingId,
            userId,
            reason,
            clubId: booking.clubId,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
          })
          .pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => {
              this.logger.error(
                `payment.refundSplit failed: booking=${bookingId} user=${userId} err=${err?.message}`,
              );
              this.notifyClient?.emit('notify.opsAlert', {
                topic: 'split-refund-failed',
                bookingId,
                userId,
                error: err?.message ?? String(err),
              });
              return throwError(() => err);
            }),
          ),
      );

      refundedAmount = Number(refundResult?.data?.refundedAmount ?? 0);
      nextStatus = ParticipantStatus.REFUNDED;
    }

    const txResult = await this.prisma.$transaction(async (tx) => {
      await tx.bookingParticipant.update({
        where: { id: participant.id },
        data: { status: nextStatus },
      });

      if (booking.gameTimeSlotId) {
        await tx.gameTimeSlotCache.updateMany({
          where: { gameTimeSlotId: booking.gameTimeSlotId },
          data: {
            bookedPlayers: { decrement: 1 },
            availablePlayers: { increment: 1 },
            isAvailable: true,
            status: TimeSlotCacheStatus.AVAILABLE,
            lastSyncAt: new Date(),
          },
        });
      }

      await tx.bookingHistory.create({
        data: {
          bookingId,
          action: 'PARTICIPANT_CANCELLED',
          userId,
          details: {
            reason: reason ?? null,
            previousStatus: participant.status,
            newStatus: nextStatus,
            refundedAmount,
          },
        },
      });

      const remaining = await tx.bookingParticipant.count({
        where: {
          bookingId,
          status: { notIn: [ParticipantStatus.CANCELLED, ParticipantStatus.REFUNDED] },
        },
      });

      let bookingCancelled = false;
      if (remaining === 0) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CANCELLED },
        });
        await tx.bookingHistory.create({
          data: {
            bookingId,
            action: 'CANCELLED',
            userId,
            details: {
              reason: 'all participants cancelled',
              trigger: 'participant-cancel-cascade',
            },
          },
        });
        bookingCancelled = true;
      }

      return { remaining, bookingCancelled };
    });

    this.logger.log(
      `Participant cancelled: booking=${bookingId} user=${userId} ` +
        `${participant.status}→${nextStatus} refunded=${refundedAmount} ` +
        `remaining=${txResult.remaining} bookingCancelled=${txResult.bookingCancelled}`,
    );

    return {
      bookingId,
      userId,
      previousStatus: participant.status,
      newStatus: nextStatus,
      refundedAmount,
      bookingCancelled: txResult.bookingCancelled,
      remainingParticipants: txResult.remaining,
    };
  }
}

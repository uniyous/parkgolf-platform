import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { eq, and, lt, gt, inArray, desc, sql } from 'drizzle-orm';
import { DrizzleService, type DrizzleTx } from '../../db/drizzle.service';
import {
  bookings, bookingHistory, bookingParticipants, gameCache, gameTimeSlotCache,
  bookingOutboxEvents, idempotencyKeys, teamSelectionMembers,
} from '../../db/schema';
import { BookingStatus, TimeSlotCacheStatus, OutboxStatus, ParticipantRole, ParticipantStatus } from '../../contracts/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

/**
 * Saga Step 원자 연산 서비스
 *
 * saga-service가 호출하는 개별 Step을 처리한다.
 * 각 메서드는 booking DB만 변경하고, 다른 서비스 호출이나 이벤트 발행을 하지 않는다.
 * (알림/슬롯/결제 등의 연쇄 호출은 saga-service가 오케스트레이션)
 *
 * 예외: 캐시 미스 시 club-service에서 슬롯/게임 정보를 조회하여 캐시를 자동 채움
 */
@Injectable()
export class BookingSagaStepService {
  private readonly logger = new Logger(BookingSagaStepService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Optional() @Inject('CLUB_SERVICE') private readonly courseClient?: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

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
      // 더치페이용 — agent가 채팅방 팀 멤버 정보 전달
      teamMembers?: Array<{ userId: number; userName?: string; userEmail?: string }>;
      chatRoomId?: string;
    };

    // 멱등성 체크
    if (dto.idempotencyKey) {
      const [existing] = await this.db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, dto.idempotencyKey)).limit(1);
      if (existing?.aggregateId) {
        const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, parseInt(existing.aggregateId))).limit(1);
        if (booking) return this.toSagaResponse(booking);
      }
    }

    // 슬롯 캐시에서 게임 정보 조회 (미스 시 club-service에서 동기화)
    let [slotCache] = await this.db.select().from(gameTimeSlotCache).where(eq(gameTimeSlotCache.gameTimeSlotId, dto.gameTimeSlotId)).limit(1);

    if (!slotCache) {
      slotCache = await this.fetchAndCacheSlot(dto.gameTimeSlotId);
      if (!slotCache) {
        throw new AppException(Errors.Course.TIMESLOT_NOT_FOUND);
      }
    }

    if (!slotCache.isAvailable || slotCache.availablePlayers < dto.playerCount) {
      throw new AppException(Errors.Booking.INSUFFICIENT_CAPACITY,
        `예약 가능 인원이 부족합니다. 가능: ${slotCache.availablePlayers}, 요청: ${dto.playerCount}`);
    }

    // 동일 유저 + 동일 날짜 + 시간 중복 체크
    if (dto.userId) {
      const [overlapping] = await this.db.select().from(bookings).where(and(
        eq(bookings.userId, dto.userId),
        eq(bookings.bookingDate, slotCache.date),
        inArray(bookings.status, [BookingStatus.PENDING, BookingStatus.SLOT_RESERVED, BookingStatus.CONFIRMED]),
        lt(bookings.startTime, slotCache.endTime),
        gt(bookings.endTime, slotCache.startTime),
      )).limit(1);

      if (overlapping) {
        throw new AppException(Errors.Booking.TIME_OVERLAP,
          `${slotCache.startTime}~${slotCache.endTime} 시간대에 이미 예약(${overlapping.bookingNumber})이 있습니다`);
      }
    }

    let [gameInfo] = await this.db.select().from(gameCache).where(eq(gameCache.gameId, slotCache.gameId)).limit(1);

    if (!gameInfo) {
      gameInfo = await this.fetchAndCacheGame(slotCache.gameId);
      if (!gameInfo) {
        throw new AppException(Errors.Course.GAME_NOT_FOUND);
      }
    }

    const pricePerPerson = Number(slotCache.price);
    const totalAmount = pricePerPerson * dto.playerCount;
    const serviceFee = Math.floor(totalAmount * 0.03);
    const totalPrice = totalAmount + serviceFee;

    const bookingNumber = this.generateBookingNumber();
    const idempotencyKeyExpiry = new Date();
    idempotencyKeyExpiry.setHours(idempotencyKeyExpiry.getHours() + 24);

    const booking = await this.db.transaction(async (tx) => {
      const [newBooking] = await tx.insert(bookings).values({
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
      }).returning();

      if (dto.idempotencyKey) {
        await tx.insert(idempotencyKeys).values({
          key: dto.idempotencyKey,
          aggregateType: 'Booking',
          aggregateId: String(newBooking.id),
          expiresAt: idempotencyKeyExpiry,
        });
      }

      await tx.insert(bookingHistory).values({
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
      });

      // 더치페이용: teamMembers가 있으면 BookingParticipant 미리 생성
      // booker는 BOOKER role, 나머지는 MEMBER role
      if (dto.paymentMethod === 'dutchpay' && Array.isArray(dto.teamMembers) && dto.teamMembers.length > 0) {
        const sharePerPerson = Math.round(totalPrice / dto.teamMembers.length);
        await tx.insert(bookingParticipants).values(
          dto.teamMembers.map((m) => ({
            bookingId: newBooking.id,
            userId: m.userId,
            userName: m.userName || '',
            userEmail: m.userEmail || '',
            role: m.userId === dto.userId ? ParticipantRole.BOOKER : ParticipantRole.MEMBER,
            status: ParticipantStatus.PENDING,
            amount: sharePerPerson,
          })),
        ).onConflictDoNothing();
      }

      return newBooking;
    });

    this.logger.log(`Booking ${booking.bookingNumber} created (PENDING) via saga-service`);

    // 더치페이일 때 participants/chatRoomId 응답에 포함 → saga의 PREPARE_SPLIT step에서 사용
    const baseResponse = this.toSagaResponse(booking);
    if (dto.paymentMethod === 'dutchpay' && Array.isArray(dto.teamMembers) && dto.teamMembers.length > 0) {
      const sharePerPerson = Math.round(totalPrice / dto.teamMembers.length);
      return {
        ...baseResponse,
        chatRoomId: dto.chatRoomId,
        participants: dto.teamMembers.map((m) => ({
          userId: m.userId,
          userName: m.userName || '',
          userEmail: m.userEmail || '',
          amount: sharePerPerson,
        })),
      };
    }
    return baseResponse;
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
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    if (booking.status !== BookingStatus.PENDING) {
      this.logger.warn(`Booking ${data.bookingId} is ${booking.status}, expected PENDING`);
      return { status: booking.status, bookingId: booking.id };
    }

    const isOnsitePayment = !booking.paymentMethod || booking.paymentMethod === 'onsite';
    const newStatus = isOnsitePayment ? BookingStatus.CONFIRMED : BookingStatus.SLOT_RESERVED;

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: newStatus }).where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'SLOT_RESERVED',
        userId: booking.userId!,
        details: {
          gameTimeSlotId: data.gameTimeSlotId,
          playerCount: data.playerCount,
          reservedAt: data.reservedAt,
          paymentMethod: booking.paymentMethod,
        },
      });

      if (isOnsitePayment) {
        await tx.insert(bookingHistory).values({
          bookingId: data.bookingId,
          action: 'CONFIRMED',
          userId: booking.userId!,
          details: { confirmedAt: new Date().toISOString() },
        });

        // 그룹 예약: BookingParticipant 자동 생성
        if (booking.teamSelectionId && booking.teamNumber) {
          await this.createParticipantsFromTeamSelection(
            tx, data.bookingId, booking.teamSelectionId, booking.teamNumber, Number(booking.pricePerPerson),
          );
        }
      }

      // 로컬 캐시 업데이트
      await tx.update(gameTimeSlotCache).set({
        bookedPlayers: sql`${gameTimeSlotCache.bookedPlayers} + ${data.playerCount}`,
        availablePlayers: sql`${gameTimeSlotCache.availablePlayers} - ${data.playerCount}`,
        lastSyncAt: new Date(),
      }).where(eq(gameTimeSlotCache.gameTimeSlotId, data.gameTimeSlotId));
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
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    if (booking.status !== BookingStatus.SLOT_RESERVED) {
      // FAILED 상태에서 결제 도착 → 자동 환불 필요
      if (booking.status === BookingStatus.FAILED) {
        await this.db.transaction(async (tx) => {
          await tx.insert(bookingHistory).values({
            bookingId: data.bookingId,
            action: 'AUTO_REFUND_REQUESTED',
            userId: booking.userId!,
            details: {
              reason: 'Payment arrived after booking timeout',
              paymentId: data.paymentId,
              paymentKey: data.paymentKey,
              amount: data.amount,
              requestedAt: new Date().toISOString(),
            },
          });

          await tx.insert(bookingOutboxEvents).values({
            aggregateType: 'Booking',
            aggregateId: String(data.bookingId),
            eventType: 'payment.cancelByBookingId',
            payload: {
              bookingId: data.bookingId,
              cancelReason: 'Auto-refund: payment arrived after booking timeout',
            },
            status: OutboxStatus.PENDING,
          });
        });
      }

      this.logger.warn(`Booking ${data.bookingId} is ${booking.status}, expected SLOT_RESERVED`);
      // 이미 CONFIRMED (e.g. 더치페이 markParticipantPaid에서 선전이) 인 경우에도
      // 후속 saga step(SEND_CONFIRMATION, REGISTER_COMPANY_MEMBER)이 동작하도록
      // 풀 필드 반환.
      return {
        bookingId: booking.id,
        status: booking.status,
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

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: BookingStatus.CONFIRMED }).where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'PAYMENT_CONFIRMED',
        userId: booking.userId!,
        details: {
          paymentId: data.paymentId,
          paymentKey: data.paymentKey,
          orderId: data.orderId,
          amount: data.amount,
          confirmedAt: new Date().toISOString(),
        },
      });

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'CONFIRMED',
        userId: booking.userId!,
        details: {
          confirmedAt: new Date().toISOString(),
          paymentMethod: booking.paymentMethod,
        },
      });

      if (booking.teamSelectionId && booking.teamNumber) {
        await this.createParticipantsFromTeamSelection(
          tx, data.bookingId, booking.teamSelectionId, booking.teamNumber, Number(booking.pricePerPerson),
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
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppException(Errors.Booking.ALREADY_CANCELLED);
    }

    const previousStatus = booking.status;

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: BookingStatus.CANCELLED }).where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'CANCELLED',
        userId: booking.userId!,
        details: {
          reason: data.cancelReason,
          previousStatus,
          cancelledBy: data.cancelledBy,
          cancelledByType: data.cancelledByType,
        },
      });

      // 로컬 슬롯 캐시 가용성 복구
      if (booking.gameTimeSlotId) {
        await tx.update(gameTimeSlotCache).set({
          bookedPlayers: sql`${gameTimeSlotCache.bookedPlayers} - ${booking.playerCount}`,
          availablePlayers: sql`${gameTimeSlotCache.availablePlayers} + ${booking.playerCount}`,
          isAvailable: true,
          status: TimeSlotCacheStatus.AVAILABLE,
          lastSyncAt: new Date(),
        }).where(eq(gameTimeSlotCache.gameTimeSlotId, booking.gameTimeSlotId));
      }
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
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    const previousStatus = booking.status;

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: BookingStatus.CANCELLED }).where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'ADMIN_CANCEL_REQUESTED',
        userId: booking.userId!,
        details: {
          reason: data.cancelReason,
          adminNote: data.adminNote,
          adminId: data.adminId,
          previousStatus,
        },
      });

      // 로컬 슬롯 캐시 가용성 복구
      if (booking.gameTimeSlotId) {
        await tx.update(gameTimeSlotCache).set({
          bookedPlayers: sql`${gameTimeSlotCache.bookedPlayers} - ${booking.playerCount}`,
          availablePlayers: sql`${gameTimeSlotCache.availablePlayers} + ${booking.playerCount}`,
          isAvailable: true,
          status: TimeSlotCacheStatus.AVAILABLE,
          lastSyncAt: new Date(),
        }).where(eq(gameTimeSlotCache.gameTimeSlotId, booking.gameTimeSlotId));
      }
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
    const [booking] = await this.db.select({ userId: bookings.userId }).from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    await this.db.insert(bookingHistory).values({
      bookingId: data.bookingId,
      action: 'REFUND_FINALIZED',
      userId: booking?.userId || 0,
      details: {
        finalizedAt: new Date().toISOString(),
        cancelAmount: data.cancelAmount,
        adminId: data.adminId,
        orchestrator: 'saga-service',
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

    const [booking] = await this.db.select({ userId: bookings.userId }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({
        status: BookingStatus.FAILED,
        sagaFailReason: 'Saga compensation — booking creation rolled back',
      }).where(eq(bookings.id, bookingId));

      await tx.insert(bookingHistory).values({
        bookingId,
        action: 'SAGA_FAILED',
        userId: booking?.userId || 0,
        details: {
          reason: 'Compensation rollback',
          failedAt: new Date().toISOString(),
          orchestrator: 'saga-service',
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
    const [history] = await this.db.select().from(bookingHistory).where(and(
      eq(bookingHistory.bookingId, data.bookingId),
      inArray(bookingHistory.action, ['CANCELLED', 'CANCEL_REQUESTED']),
    )).orderBy(desc(bookingHistory.createdAt)).limit(1);

    const previousStatus = (history?.details as Record<string, unknown>)?.previousStatus as string;
    const restoreStatus = previousStatus || 'CONFIRMED';

    const [booking] = await this.db.select({ userId: bookings.userId }).from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: restoreStatus as BookingStatus }).where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'STATUS_RESTORED',
        userId: booking?.userId || 0,
        details: {
          restoredTo: restoreStatus,
          reason: 'Saga compensation rollback',
          restoredAt: new Date().toISOString(),
          orchestrator: 'saga-service',
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
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);

    if (!booking) {
      throw new AppException(Errors.Booking.NOT_FOUND);
    }

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({
        status: BookingStatus.FAILED,
        sagaFailReason: data.reason,
      }).where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingHistory).values({
        bookingId: data.bookingId,
        action: 'PAYMENT_TIMEOUT',
        userId: booking.userId!,
        details: {
          reason: data.reason,
          timeoutAt: new Date().toISOString(),
          orchestrator: 'saga-service',
        },
      });

      // 로컬 슬롯 캐시 가용성 복구
      if (booking.gameTimeSlotId) {
        await tx.update(gameTimeSlotCache).set({
          bookedPlayers: sql`${gameTimeSlotCache.bookedPlayers} - ${booking.playerCount}`,
          availablePlayers: sql`${gameTimeSlotCache.availablePlayers} + ${booking.playerCount}`,
          isAvailable: true,
          status: TimeSlotCacheStatus.AVAILABLE,
          lastSyncAt: new Date(),
        }).where(eq(gameTimeSlotCache.gameTimeSlotId, booking.gameTimeSlotId));
      }
    });

    this.logger.log(`Booking ${data.bookingId} FAILED (payment timeout) via saga-service`);
    return {
      gameTimeSlotId: booking.gameTimeSlotId,
      playerCount: booking.playerCount,
      userId: booking.userId,
      bookingNumber: booking.bookingNumber,
    };
  }

  /**
   * 만료된 SLOT_RESERVED 예약 후보 조회만 수행 (saga-scheduler 1차 방어용)
   * 실제 정리는 saga-scheduler가 PAYMENT_TIMEOUT Saga로 처리.
   */
  async findExpiredSlotReservedBookings(timeoutMinutes: number) {
    const threshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const expired = await this.db.select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      gameTimeSlotId: bookings.gameTimeSlotId,
      playerCount: bookings.playerCount,
      userId: bookings.userId,
      clubId: bookings.clubId,
      paymentMethod: bookings.paymentMethod,
    }).from(bookings).where(and(
      eq(bookings.status, BookingStatus.SLOT_RESERVED),
      lt(bookings.createdAt, threshold),
    ));

    return expired;
  }

  /**
   * 외부 파트너 예약 생성 (Inbound: 외부 → 내부)
   * Saga를 경유하지 않고 직접 CONFIRMED 상태로 생성
   */
  async createExternalBooking(data: {
    gameTimeSlotId: number;
    gameId: number;
    playerCount: number;
    externalBookingId: string;
    playerName?: string;
    playerPhone?: string;
    bookingDate: string;
    startTime: string;
    endTime?: string;
    clubId?: number;
    clubName?: string;
    gameName?: string;
    pricePerPerson?: number;
  }) {
    // 중복 체크
    const [existing] = await this.db.select().from(bookings).where(eq(bookings.externalBookingId, data.externalBookingId)).limit(1);
    if (existing) {
      this.logger.warn(`External booking ${data.externalBookingId} already exists (id=${existing.id})`);
      return this.toSagaResponse(existing);
    }

    const bookingNumber = this.generateBookingNumber();
    const pricePerPerson = data.pricePerPerson ?? 0;
    const totalPrice = pricePerPerson * data.playerCount;

    const booking = await this.db.transaction(async (tx) => {
      const [newBooking] = await tx.insert(bookings).values({
        gameTimeSlotId: data.gameTimeSlotId,
        gameId: data.gameId,
        gameName: data.gameName,
        bookingDate: new Date(data.bookingDate),
        startTime: data.startTime,
        endTime: data.endTime || '',
        clubId: data.clubId,
        clubName: data.clubName,
        guestName: data.playerName,
        guestPhone: data.playerPhone,
        playerCount: data.playerCount,
        pricePerPerson,
        serviceFee: 0,
        totalPrice,
        status: BookingStatus.CONFIRMED,
        source: 'PARTNER',
        externalBookingId: data.externalBookingId,
        paymentMethod: 'onsite',
        bookingNumber,
      }).returning();

      await tx.insert(bookingHistory).values({
        bookingId: newBooking.id,
        action: 'CREATED',
        userId: 0,
        details: {
          source: 'PARTNER',
          externalBookingId: data.externalBookingId,
          createdAt: new Date().toISOString(),
        },
      });

      await tx.insert(bookingHistory).values({
        bookingId: newBooking.id,
        action: 'CONFIRMED',
        userId: 0,
        details: {
          source: 'PARTNER',
          confirmedAt: new Date().toISOString(),
        },
      });

      return newBooking;
    });

    this.logger.log(`External booking created: ${booking.bookingNumber} (externalId=${data.externalBookingId})`);
    return this.toSagaResponse(booking);
  }

  /**
   * 외부 파트너 예약 취소 (Inbound: 외부 → 내부)
   */
  async cancelExternalBooking(data: {
    externalBookingId: string;
    cancelReason?: string;
  }) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.externalBookingId, data.externalBookingId)).limit(1);

    if (!booking) {
      this.logger.warn(`External booking ${data.externalBookingId} not found`);
      return { status: 'NOT_FOUND', externalBookingId: data.externalBookingId };
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return { status: 'ALREADY_CANCELLED', bookingId: booking.id };
    }

    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: BookingStatus.CANCELLED }).where(eq(bookings.id, booking.id));

      await tx.insert(bookingHistory).values({
        bookingId: booking.id,
        action: 'CANCELLED',
        userId: 0,
        details: {
          reason: data.cancelReason || '외부 시스템 취소',
          source: 'PARTNER',
          previousStatus: booking.status,
          cancelledAt: new Date().toISOString(),
        },
      });

      // 로컬 슬롯 캐시 가용성 복구
      if (booking.gameTimeSlotId) {
        await tx.update(gameTimeSlotCache).set({
          bookedPlayers: sql`${gameTimeSlotCache.bookedPlayers} - ${booking.playerCount}`,
          availablePlayers: sql`${gameTimeSlotCache.availablePlayers} + ${booking.playerCount}`,
          isAvailable: true,
          status: TimeSlotCacheStatus.AVAILABLE,
          lastSyncAt: new Date(),
        }).where(eq(gameTimeSlotCache.gameTimeSlotId, booking.gameTimeSlotId));
      }
    });

    this.logger.log(`External booking ${data.externalBookingId} cancelled (bookingId=${booking.id})`);
    return {
      status: 'CANCELLED',
      bookingId: booking.id,
      gameTimeSlotId: booking.gameTimeSlotId,
      playerCount: booking.playerCount,
    };
  }

  private toSagaResponse(booking: Record<string, unknown>) {
    return {
      id: booking.id,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      gameId: booking.gameId,
      gameTimeSlotId: booking.gameTimeSlotId,
      gameName: booking.gameName,
      gameCode: booking.gameCode,
      frontNineCourseId: booking.frontNineCourseId,
      frontNineCourseName: booking.frontNineCourseName,
      backNineCourseId: booking.backNineCourseId,
      backNineCourseName: booking.backNineCourseName,
      clubId: booking.clubId,
      clubName: booking.clubName,
      bookingDate: booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString().split('T')[0]
        : booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime || '',
      playerCount: booking.playerCount,
      pricePerPerson: booking.pricePerPerson != null ? Math.round(Number(String(booking.pricePerPerson))) : 0,
      serviceFee: booking.serviceFee != null ? Math.round(Number(String(booking.serviceFee))) : 0,
      totalPrice: booking.totalPrice != null ? Math.round(Number(String(booking.totalPrice))) : 0,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      specialRequests: booking.specialRequests,
      userId: booking.userId,
      userEmail: booking.userEmail,
      userName: booking.userName,
      userPhone: booking.userPhone,
      createdAt: booking.createdAt instanceof Date
        ? (booking.createdAt as Date).toISOString()
        : booking.createdAt,
      updatedAt: booking.updatedAt instanceof Date
        ? (booking.updatedAt as Date).toISOString()
        : booking.updatedAt,
    };
  }

  private generateBookingNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BK${dateStr}${random}`;
  }

  private async createParticipantsFromTeamSelection(
    tx: DrizzleTx,
    bookingId: number,
    teamSelectionId: number,
    teamNumber: number,
    pricePerPerson: number,
  ): Promise<void> {
    const members = await tx.select().from(teamSelectionMembers).where(and(
      eq(teamSelectionMembers.teamSelectionId, teamSelectionId),
      eq(teamSelectionMembers.teamNumber, teamNumber),
    ));

    if (members.length === 0) return;

    await tx.insert(bookingParticipants).values(
      members.map((member) => ({
        bookingId,
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        role: member.role as ParticipantRole,
        status: ParticipantStatus.PENDING,
        amount: pricePerPerson,
      })),
    ).onConflictDoNothing();

    this.logger.log(`Created ${members.length} BookingParticipants for booking ${bookingId}`);
  }

  /**
   * 캐시 미스 시 club-service에서 슬롯 정보 조회 → 캐시 upsert
   */
  private async fetchAndCacheSlot(gameTimeSlotId: number) {
    if (!this.courseClient) {
      this.logger.warn('[CacheMiss] CLUB_SERVICE client not available');
      return null;
    }

    try {
      this.logger.log(`[CacheMiss] Fetching slot ${gameTimeSlotId} from club-service`);
      const response = await firstValueFrom(
        this.courseClient.send('gameTimeSlots.get', { timeSlotId: gameTimeSlotId }).pipe(
          timeout(5000),
          catchError((err) => { throw new Error(`Failed to fetch slot: ${err.message}`); }),
        ),
      );

      if (!response?.success || !response?.data) {
        this.logger.warn(`[CacheMiss] Slot ${gameTimeSlotId} not found in club-service`);
        return null;
      }

      const slot = response.data;
      const availablePlayers = (slot.maxPlayers || slot.maxBookings || 0) - (slot.bookedPlayers || slot.currentBookings || 0);

      // game 정보에서 clubId 추출 (mapTimeSlotToResponse에서 clubId는 game 관계에서 옴)
      let clubId = slot.clubId || 0;
      let clubName = slot.clubName || '';
      if (!clubId && slot.gameId) {
        const gameResp = await this.fetchAndCacheGame(slot.gameId);
        if (gameResp) {
          clubId = gameResp.clubId;
          clubName = gameResp.clubName;
        }
      }

      const values = {
        gameTimeSlotId,
        gameId: slot.gameId,
        gameName: slot.gameName || '',
        gameCode: slot.gameCode || '',
        clubId,
        clubName,
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxPlayers: slot.maxPlayers || 4,
        bookedPlayers: slot.bookedPlayers || 0,
        availablePlayers,
        isAvailable: availablePlayers > 0,
        price: slot.price || 0,
        isPremium: slot.isPremium || false,
        status: TimeSlotCacheStatus.AVAILABLE,
        lastSyncAt: new Date(),
      };
      const [cached] = await this.db.insert(gameTimeSlotCache).values(values)
        .onConflictDoUpdate({ target: gameTimeSlotCache.gameTimeSlotId, set: values })
        .returning();

      this.logger.log(`[CacheMiss] Slot ${gameTimeSlotId} cached successfully`);
      return cached;
    } catch (error) {
      this.logger.error(`[CacheMiss] Failed to fetch/cache slot ${gameTimeSlotId}: ${error.message}`);
      return null;
    }
  }

  /**
   * 캐시 미스 시 club-service에서 게임 정보 조회 → 캐시 upsert
   */
  private async fetchAndCacheGame(gameId: number) {
    if (!this.courseClient) {
      this.logger.warn('[CacheMiss] CLUB_SERVICE client not available');
      return null;
    }

    try {
      this.logger.log(`[CacheMiss] Fetching game ${gameId} from club-service`);
      const response = await firstValueFrom(
        this.courseClient.send('games.get', { gameId }).pipe(
          timeout(5000),
          catchError((err) => { throw new Error(`Failed to fetch game: ${err.message}`); }),
        ),
      );

      if (!response?.success || !response?.data) {
        this.logger.warn(`[CacheMiss] Game ${gameId} not found in club-service`);
        return null;
      }

      const game = response.data;
      const values = {
        gameId,
        name: game.name || '',
        code: game.code || '',
        clubId: game.clubId || 0,
        clubName: game.clubName || '',
        frontNineCourseId: game.frontNineCourseId || 0,
        frontNineCourseName: game.frontNineCourseName || '',
        backNineCourseId: game.backNineCourseId || 0,
        backNineCourseName: game.backNineCourseName || '',
        basePrice: game.basePrice || 0,
        lastSyncAt: new Date(),
      };
      const [cached] = await this.db.insert(gameCache).values(values)
        .onConflictDoUpdate({ target: gameCache.gameId, set: values })
        .returning();

      this.logger.log(`[CacheMiss] Game ${gameId} cached successfully`);
      return cached;
    } catch (error) {
      this.logger.error(`[CacheMiss] Failed to fetch/cache game ${gameId}: ${error.message}`);
      return null;
    }
  }
}

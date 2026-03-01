import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SettlementStatus, ParticipantRole, ParticipantStatus } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { randomUUID } from 'crypto';
import { NATS_TIMEOUTS } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

export interface CreateBookingGroupDto {
  chatRoomId: string;
  bookerId: number;
  bookerName: string;
  bookerEmail: string;
  clubId: number;
  clubName: string;
  date: string; // YYYY-MM-DD
  teams: Array<{
    gameTimeSlotId: number;
    participants: Array<{
      userId: number;
      userName: string;
      userEmail: string;
      role: ParticipantRole;
    }>;
  }>;
  pricePerPerson: number;
  paymentMethod: string; // 'onsite' | 'dutchpay'
  expirationMinutes?: number; // 기본 30분
}

@Injectable()
export class BookingGroupService {
  private readonly logger = new Logger(BookingGroupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('COURSE_SERVICE') private readonly courseServiceClient?: ClientProxy,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
    @Optional() @Inject('CHAT_SERVICE') private readonly chatClient?: ClientProxy,
  ) {}

  /**
   * 그룹 번호 생성: GRP-YYYYMMDD-XXX
   */
  private generateGroupNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    return `GRP-${date}-${suffix}`;
  }

  /**
   * 그룹 예약 생성
   * 팀별로 Booking을 생성하고 BookingGroup으로 묶음
   */
  async createBookingGroup(dto: CreateBookingGroupDto) {
    const requestId = `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger.log(`[${requestId}] Creating booking group: ${dto.teams.length} teams`);

    const totalParticipants = dto.teams.reduce(
      (sum, team) => sum + team.participants.length,
      0,
    );
    const totalPrice = totalParticipants * dto.pricePerPerson;
    const expirationMinutes = dto.expirationMinutes || 30;
    const expiredAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // 트랜잭션으로 BookingGroup + Bookings + Participants 생성
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. BookingGroup 생성
      const group = await tx.bookingGroup.create({
        data: {
          groupNumber: this.generateGroupNumber(),
          chatRoomId: dto.chatRoomId,
          bookerId: dto.bookerId,
          bookerName: dto.bookerName,
          bookerEmail: dto.bookerEmail,
          clubId: dto.clubId,
          clubName: dto.clubName,
          date: dto.date,
          teamCount: dto.teams.length,
          totalParticipants,
          totalPrice,
          pricePerPerson: dto.pricePerPerson,
          settlementStatus: SettlementStatus.PENDING,
          expiredAt,
        },
      });

      // 2. 팀별 Booking 생성
      const bookings = [];
      for (let i = 0; i < dto.teams.length; i++) {
        const team = dto.teams[i];
        const playerCount = team.participants.length;
        const bookingNumber = `BK-${randomUUID().replace(/-/g, '').toUpperCase().slice(0, 8)}-${randomUUID().replace(/-/g, '').toUpperCase().slice(0, 4)}`;

        const booking = await tx.booking.create({
          data: {
            bookingGroupId: group.id,
            teamNumber: i + 1,
            gameTimeSlotId: team.gameTimeSlotId,
            gameId: 0, // Saga에서 채워짐
            bookingDate: new Date(dto.date),
            startTime: '', // Saga에서 채워짐
            endTime: '', // Saga에서 채워짐
            clubId: dto.clubId,
            clubName: dto.clubName,
            userId: dto.bookerId,
            userName: dto.bookerName,
            userEmail: dto.bookerEmail,
            playerCount,
            pricePerPerson: dto.pricePerPerson,
            serviceFee: 0,
            totalPrice: playerCount * dto.pricePerPerson,
            status: 'PENDING',
            paymentMethod: dto.paymentMethod === 'dutchpay' ? 'card' : dto.paymentMethod,
            bookingNumber,
            idempotencyKey: randomUUID(),
          },
        });

        // 3. 참여자 생성
        for (const participant of team.participants) {
          await tx.bookingParticipant.create({
            data: {
              bookingId: booking.id,
              userId: participant.userId,
              userName: participant.userName,
              userEmail: participant.userEmail,
              role: participant.role,
              status: ParticipantStatus.PENDING,
              amount: dto.pricePerPerson,
            },
          });
        }

        // 4. Outbox 이벤트 생성 (Saga: 슬롯 예약 요청)
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'Booking',
            aggregateId: String(booking.id),
            eventType: 'slot.reserve',
            payload: {
              bookingId: booking.id,
              gameTimeSlotId: team.gameTimeSlotId,
              playerCount,
              bookingGroupId: group.id,
            },
            status: 'PENDING',
          },
        });

        bookings.push(booking);
      }

      return { group, bookings };
    });

    this.logger.log(
      `[${requestId}] Booking group created: ${result.group.groupNumber} with ${result.bookings.length} bookings`,
    );

    return result;
  }

  /**
   * 그룹 예약 조회
   */
  async getBookingGroup(groupId: number) {
    const group = await this.prisma.bookingGroup.findUnique({
      where: { id: groupId },
      include: {
        bookings: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!group) {
      throw new AppException(Errors.Group.NOT_FOUND);
    }

    return group;
  }

  /**
   * 그룹 번호로 조회
   */
  async getBookingGroupByNumber(groupNumber: string) {
    const group = await this.prisma.bookingGroup.findUnique({
      where: { groupNumber },
      include: {
        bookings: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!group) {
      throw new AppException(Errors.Group.NOT_FOUND);
    }

    return group;
  }

  /**
   * 참여자 결제 완료 처리
   */
  async markParticipantPaid(bookingId: number, userId: number) {
    // 참여자 조회
    const participant = await this.prisma.bookingParticipant.findUnique({
      where: { bookingId_userId: { bookingId, userId } },
    });

    if (!participant) {
      throw new AppException(Errors.Group.PARTICIPANT_NOT_FOUND);
    }

    // 결제 완료 처리
    await this.prisma.bookingParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantStatus.PAID,
        paidAt: new Date(),
      },
    });

    // 해당 Booking의 전체 참여자 결제 상태 확인
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { participants: true },
    });

    if (!booking?.bookingGroupId) return { settled: false };

    // 그룹 전체 정산 상태 업데이트
    const allParticipants = await this.prisma.bookingParticipant.findMany({
      where: {
        booking: { bookingGroupId: booking.bookingGroupId },
      },
    });

    const paidCount = allParticipants.filter(
      (p) => p.status === ParticipantStatus.PAID,
    ).length;
    const totalCount = allParticipants.length;

    let newStatus: SettlementStatus;
    if (paidCount === totalCount) {
      newStatus = SettlementStatus.COMPLETED;
    } else if (paidCount > 0) {
      newStatus = SettlementStatus.PARTIAL;
    } else {
      newStatus = SettlementStatus.PENDING;
    }

    await this.prisma.bookingGroup.update({
      where: { id: booking.bookingGroupId },
      data: { settlementStatus: newStatus },
    });

    // 실시간 정산 카드 Push (agent-service 경유 없이 직접 발행)
    if (this.chatClient && this.notificationPublisher) {
      const group = await this.prisma.bookingGroup.findUnique({
        where: { id: booking.bookingGroupId },
      });

      if (group?.chatRoomId) {
        const allPaid = paidCount === totalCount;
        const content = allPaid
          ? `모든 참여자의 결제가 완료되었습니다! (${paidCount}/${totalCount})`
          : `${participant.userName}님이 결제를 완료했습니다. (${paidCount}/${totalCount})`;

        const settlementData = {
          bookingId,
          bookerId: group.bookerId,
          teamNumber: 1,
          clubName: group.clubName,
          date: group.date,
          slotTime: '',
          totalParticipants: totalCount,
          pricePerPerson: group.pricePerPerson,
          totalPrice: group.totalPrice,
          paidCount,
          expiredAt: group.expiredAt?.toISOString() || '',
          participants: allParticipants.map((p) => ({
            userId: p.userId,
            userName: p.userName,
            orderId: '',
            amount: p.amount,
            status: p.status,
            expiredAt: '',
          })),
        };

        const metadata = JSON.stringify({
          conversationId: null,
          state: 'SETTLING',
          actions: [{ type: 'SETTLEMENT_STATUS', data: settlementData }],
          targetUserIds: [group.bookerId],
        });

        const message = {
          id: randomUUID(),
          roomId: group.chatRoomId,
          senderId: 0,
          senderName: 'AI 예약 도우미',
          content,
          type: 'AI_ASSISTANT',
          metadata,
          createdAt: new Date().toISOString(),
        };

        // 1. DB 저장
        firstValueFrom(
          this.chatClient.send('chat.messages.save', message).pipe(
            timeout(5000),
            catchError((err) => {
              this.logger.error(`Settlement card DB save failed: ${err.message}`);
              return of(null);
            }),
          ),
        );

        // 2. Socket.IO 브로드캐스트
        this.notificationPublisher.emit('chat.message.room', {
          roomId: group.chatRoomId,
          message: { ...message, messageType: 'AI_ASSISTANT' },
        });
      }
    }

    return {
      settled: newStatus === SettlementStatus.COMPLETED,
      paidCount,
      totalCount,
      settlementStatus: newStatus,
    };
  }

  /**
   * 그룹 예약 취소
   */
  async cancelBookingGroup(groupId: number) {
    const group = await this.prisma.bookingGroup.findUnique({
      where: { id: groupId },
      include: { bookings: true },
    });

    if (!group) {
      throw new AppException(Errors.Group.NOT_FOUND);
    }

    await this.prisma.$transaction(async (tx) => {
      // 그룹 상태 변경
      await tx.bookingGroup.update({
        where: { id: groupId },
        data: { settlementStatus: SettlementStatus.CANCELLED },
      });

      // 모든 Booking 취소
      for (const booking of group.bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });

        // 참여자 전원 취소
        await tx.bookingParticipant.updateMany({
          where: { bookingId: booking.id },
          data: { status: ParticipantStatus.CANCELLED },
        });
      }
    });

    return { cancelled: true, groupNumber: group.groupNumber };
  }
}

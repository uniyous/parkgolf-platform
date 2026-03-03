import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TeamSelectionStatus, ParticipantRole, ParticipantStatus } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { randomUUID } from 'crypto';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

export interface CreateTeamSelectionDto {
  chatRoomId: string;
  bookerId: number;
  bookerName: string;
  clubId: number;
  clubName: string;
  date: string; // YYYY-MM-DD
}

export interface AddTeamMembersDto {
  teamSelectionId?: number;
  groupId?: string;
  teamNumber: number;
  members: Array<{
    userId: number;
    userName: string;
    userEmail: string;
    role?: ParticipantRole;
  }>;
}

@Injectable()
export class TeamSelectionService {
  private readonly logger = new Logger(TeamSelectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('NOTIFICATION_SERVICE') private readonly notificationPublisher?: ClientProxy,
    @Optional() @Inject('CHAT_SERVICE') private readonly chatClient?: ClientProxy,
  ) {}

  /**
   * 그룹 ID 생성: GRP-YYYYMMDD-XXXXXX
   */
  private generateGroupId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    return `GRP-${date}-${suffix}`;
  }

  /**
   * 팀 선정 세션 생성
   */
  async create(dto: CreateTeamSelectionDto) {
    const teamSelection = await this.prisma.teamSelection.create({
      data: {
        chatRoomId: dto.chatRoomId,
        groupId: this.generateGroupId(),
        bookerId: dto.bookerId,
        bookerName: dto.bookerName,
        clubId: dto.clubId,
        clubName: dto.clubName,
        date: dto.date,
        status: TeamSelectionStatus.SELECTING,
      },
      include: { members: true },
    });

    this.logger.log(`TeamSelection created: id=${teamSelection.id}, groupId=${teamSelection.groupId}`);
    return teamSelection;
  }

  /**
   * 팀에 멤버 추가
   */
  async addMembers(dto: AddTeamMembersDto) {
    const teamSelection = await this.findTeamSelection(dto.teamSelectionId, dto.groupId);

    if (teamSelection.status !== TeamSelectionStatus.SELECTING) {
      throw new AppException(Errors.TeamSelection.INVALID_STATUS);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const member of dto.members) {
        await tx.teamSelectionMember.upsert({
          where: {
            teamSelectionId_teamNumber_userId: {
              teamSelectionId: teamSelection.id,
              teamNumber: dto.teamNumber,
              userId: member.userId,
            },
          },
          update: {
            userName: member.userName,
            userEmail: member.userEmail,
            role: member.role || ParticipantRole.MEMBER,
          },
          create: {
            teamSelectionId: teamSelection.id,
            teamNumber: dto.teamNumber,
            userId: member.userId,
            userName: member.userName,
            userEmail: member.userEmail,
            role: member.role || ParticipantRole.MEMBER,
          },
        });
      }

      // teamCount 업데이트 (최대 팀 번호)
      const maxTeam = await tx.teamSelectionMember.findFirst({
        where: { teamSelectionId: teamSelection.id },
        orderBy: { teamNumber: 'desc' },
        select: { teamNumber: true },
      });

      await tx.teamSelection.update({
        where: { id: teamSelection.id },
        data: { teamCount: maxTeam?.teamNumber || 0 },
      });
    });

    const updated = await this.prisma.teamSelection.findUnique({
      where: { id: teamSelection.id },
      include: { members: { orderBy: [{ teamNumber: 'asc' }, { createdAt: 'asc' }] } },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: added ${dto.members.length} members to team ${dto.teamNumber}`);
    return updated;
  }

  /**
   * 팀 선정 조회
   */
  async get(data: { id?: number; groupId?: string }) {
    const teamSelection = await this.findTeamSelection(data.id, data.groupId);
    return teamSelection;
  }

  /**
   * 팀 구성 완료 표시 (status → READY)
   */
  async ready(data: { id?: number; groupId?: string }) {
    const teamSelection = await this.findTeamSelection(data.id, data.groupId);

    if (teamSelection.status !== TeamSelectionStatus.SELECTING) {
      throw new AppException(Errors.TeamSelection.INVALID_STATUS);
    }

    // 멤버가 있는지 확인
    if (teamSelection.members.length === 0) {
      throw new AppException(Errors.TeamSelection.NO_MEMBERS);
    }

    const updated = await this.prisma.teamSelection.update({
      where: { id: teamSelection.id },
      data: { status: TeamSelectionStatus.READY },
      include: { members: { orderBy: [{ teamNumber: 'asc' }, { createdAt: 'asc' }] } },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: status → READY`);
    return updated;
  }

  /**
   * 팀 선정 취소
   */
  async cancel(data: { id?: number; groupId?: string }) {
    const teamSelection = await this.findTeamSelection(data.id, data.groupId);

    if (teamSelection.status === TeamSelectionStatus.COMPLETED) {
      throw new AppException(Errors.TeamSelection.INVALID_STATUS);
    }

    const updated = await this.prisma.teamSelection.update({
      where: { id: teamSelection.id },
      data: { status: TeamSelectionStatus.CANCELLED },
      include: { members: true },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: status → CANCELLED`);
    return updated;
  }

  /**
   * 예약 진행 중 표시 (status → BOOKING)
   */
  async markBooking(data: { id?: number; groupId?: string }) {
    const teamSelection = await this.findTeamSelection(data.id, data.groupId);

    if (teamSelection.status !== TeamSelectionStatus.READY) {
      throw new AppException(Errors.TeamSelection.INVALID_STATUS);
    }

    const updated = await this.prisma.teamSelection.update({
      where: { id: teamSelection.id },
      data: { status: TeamSelectionStatus.BOOKING },
      include: { members: true },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: status → BOOKING`);
    return updated;
  }

  /**
   * 모든 팀 예약 완료 표시 (status → COMPLETED)
   */
  async markCompleted(data: { id?: number; groupId?: string }) {
    const teamSelection = await this.findTeamSelection(data.id, data.groupId);

    const updated = await this.prisma.teamSelection.update({
      where: { id: teamSelection.id },
      data: { status: TeamSelectionStatus.COMPLETED },
      include: { members: true },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: status → COMPLETED`);
    return updated;
  }

  /**
   * 참여자 결제 완료 처리
   * BookingGroup 없이 groupId 기반으로 정산 상태 파생
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

    // 해당 Booking의 groupId 확인
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking?.groupId) return { settled: false };

    // 같은 groupId의 모든 참여자 조회 → 정산 상태 파생
    const allParticipants = await this.prisma.bookingParticipant.findMany({
      where: {
        booking: { groupId: booking.groupId },
      },
    });

    const paidCount = allParticipants.filter(
      (p) => p.status === ParticipantStatus.PAID,
    ).length;
    const totalCount = allParticipants.length;

    const settlementStatus =
      paidCount === totalCount ? 'COMPLETED' :
      paidCount > 0 ? 'PARTIAL' : 'PENDING';

    // 실시간 정산 카드 Push
    if (this.chatClient && this.notificationPublisher) {
      const teamSelection = await this.prisma.teamSelection.findUnique({
        where: { groupId: booking.groupId },
      });

      if (teamSelection?.chatRoomId) {
        const allPaid = paidCount === totalCount;
        const content = allPaid
          ? `모든 참여자의 결제가 완료되었습니다! (${paidCount}/${totalCount})`
          : `${participant.userName}님이 결제를 완료했습니다. (${paidCount}/${totalCount})`;

        const settlementData = {
          bookingId,
          bookerId: teamSelection.bookerId,
          teamNumber: booking.teamNumber || 1,
          clubName: teamSelection.clubName,
          date: teamSelection.date,
          slotTime: booking.startTime || '',
          totalParticipants: totalCount,
          pricePerPerson: Number(booking.pricePerPerson),
          totalPrice: Number(booking.totalPrice),
          paidCount,
          expiredAt: '',
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
          targetUserIds: [teamSelection.bookerId],
        });

        const message = {
          id: randomUUID(),
          roomId: teamSelection.chatRoomId,
          senderId: 0,
          senderName: 'AI 예약 도우미',
          content,
          messageType: 'AI_ASSISTANT',
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
          roomId: teamSelection.chatRoomId,
          message,
        });
      }
    }

    return {
      settled: settlementStatus === 'COMPLETED',
      paidCount,
      totalCount,
      settlementStatus,
    };
  }

  /**
   * 그룹 예약 취소 (groupId 기반)
   */
  async cancelGroupBookings(groupId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { groupId },
    });

    if (bookings.length === 0) {
      throw new AppException(Errors.Group.NOT_FOUND);
    }

    await this.prisma.$transaction(async (tx) => {
      // 모든 Booking 취소
      for (const booking of bookings) {
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

      // TeamSelection도 취소
      await tx.teamSelection.updateMany({
        where: { groupId },
        data: { status: TeamSelectionStatus.CANCELLED },
      });
    });

    return { cancelled: true, groupId };
  }

  /**
   * TeamSelection 조회 헬퍼
   */
  private async findTeamSelection(id?: number, groupId?: string) {
    let teamSelection;

    if (groupId) {
      teamSelection = await this.prisma.teamSelection.findUnique({
        where: { groupId },
        include: { members: { orderBy: [{ teamNumber: 'asc' }, { createdAt: 'asc' }] } },
      });
    } else if (id) {
      teamSelection = await this.prisma.teamSelection.findUnique({
        where: { id },
        include: { members: { orderBy: [{ teamNumber: 'asc' }, { createdAt: 'asc' }] } },
      });
    }

    if (!teamSelection) {
      throw new AppException(Errors.TeamSelection.NOT_FOUND);
    }

    return teamSelection;
  }
}

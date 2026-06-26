import { Injectable, Logger } from '@nestjs/common';
import { eq, asc, desc } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { teamSelections, teamSelectionMembers } from '../../db/schema';
import { TeamSelectionStatus, ParticipantRole } from '../../contracts/enums';
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

const membersOrder = [asc(teamSelectionMembers.teamNumber), asc(teamSelectionMembers.createdAt)];

@Injectable()
export class TeamSelectionService {
  private readonly logger = new Logger(TeamSelectionService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

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
    const [teamSelection] = await this.db.insert(teamSelections).values({
      chatRoomId: dto.chatRoomId,
      groupId: this.generateGroupId(),
      bookerId: dto.bookerId,
      bookerName: dto.bookerName,
      clubId: dto.clubId,
      clubName: dto.clubName,
      date: dto.date,
      status: TeamSelectionStatus.SELECTING,
    }).returning();

    this.logger.log(`TeamSelection created: id=${teamSelection.id}, groupId=${teamSelection.groupId}`);
    return { ...teamSelection, members: [] };
  }

  /**
   * 팀에 멤버 추가
   */
  async addMembers(dto: AddTeamMembersDto) {
    const teamSelection = await this.findTeamSelection(dto.teamSelectionId, dto.groupId);

    if (teamSelection.status !== TeamSelectionStatus.SELECTING) {
      throw new AppException(Errors.TeamSelection.INVALID_STATUS);
    }

    await this.db.transaction(async (tx) => {
      for (const member of dto.members) {
        await tx.insert(teamSelectionMembers).values({
          teamSelectionId: teamSelection.id,
          teamNumber: dto.teamNumber,
          userId: member.userId,
          userName: member.userName,
          userEmail: member.userEmail,
          role: member.role || ParticipantRole.MEMBER,
        }).onConflictDoUpdate({
          target: [teamSelectionMembers.teamSelectionId, teamSelectionMembers.teamNumber, teamSelectionMembers.userId],
          set: {
            userName: member.userName,
            userEmail: member.userEmail,
            role: member.role || ParticipantRole.MEMBER,
          },
        });
      }

      // teamCount 업데이트 (최대 팀 번호)
      const [maxTeam] = await tx.select({ teamNumber: teamSelectionMembers.teamNumber })
        .from(teamSelectionMembers)
        .where(eq(teamSelectionMembers.teamSelectionId, teamSelection.id))
        .orderBy(desc(teamSelectionMembers.teamNumber))
        .limit(1);

      await tx.update(teamSelections).set({ teamCount: maxTeam?.teamNumber || 0 }).where(eq(teamSelections.id, teamSelection.id));
    });

    const updated = await this.db.query.teamSelections.findFirst({
      where: eq(teamSelections.id, teamSelection.id),
      with: { members: { orderBy: membersOrder } },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: added ${dto.members.length} members to team ${dto.teamNumber}`);
    return updated;
  }

  /**
   * 팀 선정 조회
   */
  async get(data: { id?: number; groupId?: string }) {
    return this.findTeamSelection(data.id, data.groupId);
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

    await this.db.update(teamSelections).set({ status: TeamSelectionStatus.READY }).where(eq(teamSelections.id, teamSelection.id));
    const updated = await this.db.query.teamSelections.findFirst({
      where: eq(teamSelections.id, teamSelection.id),
      with: { members: { orderBy: membersOrder } },
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

    await this.db.update(teamSelections).set({ status: TeamSelectionStatus.CANCELLED }).where(eq(teamSelections.id, teamSelection.id));
    const updated = await this.db.query.teamSelections.findFirst({
      where: eq(teamSelections.id, teamSelection.id),
      with: { members: true },
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

    await this.db.update(teamSelections).set({ status: TeamSelectionStatus.BOOKING }).where(eq(teamSelections.id, teamSelection.id));
    const updated = await this.db.query.teamSelections.findFirst({
      where: eq(teamSelections.id, teamSelection.id),
      with: { members: true },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: status → BOOKING`);
    return updated;
  }

  /**
   * 모든 팀 예약 완료 표시 (status → COMPLETED)
   */
  async markCompleted(data: { id?: number; groupId?: string }) {
    const teamSelection = await this.findTeamSelection(data.id, data.groupId);

    await this.db.update(teamSelections).set({ status: TeamSelectionStatus.COMPLETED }).where(eq(teamSelections.id, teamSelection.id));
    const updated = await this.db.query.teamSelections.findFirst({
      where: eq(teamSelections.id, teamSelection.id),
      with: { members: true },
    });

    this.logger.log(`TeamSelection ${teamSelection.groupId}: status → COMPLETED`);
    return updated;
  }

  /**
   * TeamSelection 조회 헬퍼
   */
  private async findTeamSelection(id?: number, groupId?: string) {
    let teamSelection;

    if (groupId) {
      teamSelection = await this.db.query.teamSelections.findFirst({
        where: eq(teamSelections.groupId, groupId),
        with: { members: { orderBy: membersOrder } },
      });
    } else if (id) {
      teamSelection = await this.db.query.teamSelections.findFirst({
        where: eq(teamSelections.id, id),
        with: { members: { orderBy: membersOrder } },
      });
    }

    if (!teamSelection) {
      throw new AppException(Errors.TeamSelection.NOT_FOUND);
    }

    return teamSelection;
  }
}

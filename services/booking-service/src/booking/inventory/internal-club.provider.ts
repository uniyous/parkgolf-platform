import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import {
  IInventoryProvider, AvailabilityQuery, SlotAvailability, SlotSnapshot,
  ReserveRequest, ReserveResult, ReservationRef, ConfirmResult,
} from './inventory-provider.interface';

/**
 * 1st-party 인벤토리 어댑터 (UNI-97)
 *
 * 자체 운영 골프장(club-service)을 InventoryProvider 계약으로 래핑.
 * booking-service의 club-service/iam 직접 결합을 이 어댑터 뒤로 은닉한다.
 *
 * 결정 B: `reserve`는 marketplace-saga-service가 club-service로 직접 호출하므로(단일 경계 횡단),
 * 이 어댑터의 reserve/cancel/confirm은 계약 완결성·비-saga 경로용. booking-service가
 * 실제로 쓰는 것은 getAvailability(캐시미스 가용성 조회).
 */
@Injectable()
export class InternalClubProvider implements IInventoryProvider {
  private readonly logger = new Logger(InternalClubProvider.name);

  constructor(
    @Optional() @Inject('CLUB_SERVICE') private readonly club?: ClientProxy,
    @Optional() @Inject('IAM_SERVICE') private readonly iam?: ClientProxy,
  ) {}

  private ensureClient(): ClientProxy {
    if (!this.club) {
      throw new Error('CLUB_SERVICE client not available');
    }
    return this.club;
  }

  async getAvailability(query: AvailabilityQuery): Promise<SlotAvailability> {
    const client = this.ensureClient();
    const slotResp = await firstValueFrom(
      client.send('gameTimeSlots.get', { timeSlotId: query.gameTimeSlotId }).pipe(
        timeout(5000),
        catchError((err) => { throw new Error(`Failed to fetch slot: ${err.message}`); }),
      ),
    );
    if (!slotResp?.success || !slotResp?.data) {
      throw new Error(`Slot ${query.gameTimeSlotId} not found in club-service`);
    }
    const slot = slotResp.data;

    let clubId: number = slot.clubId || 0;
    let clubName: string = slot.clubName || '';
    if (!clubId && slot.gameId) {
      const game = await this.fetchGame(slot.gameId);
      if (game) {
        clubId = game.clubId || 0;
        clubName = game.clubName || '';
      }
    }

    const maxPlayers: number = slot.maxPlayers || slot.maxBookings || 0;
    const bookedPlayers: number = slot.bookedPlayers || slot.currentBookings || 0;
    const availablePlayers = maxPlayers - bookedPlayers;

    const snapshot: SlotSnapshot = {
      gameTimeSlotId: query.gameTimeSlotId,
      gameId: slot.gameId || 0,
      gameName: slot.gameName || '',
      gameCode: slot.gameCode || '',
      clubId,
      clubName,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      pricePerPerson: slot.price || 0,
      maxPlayers,
      bookedPlayers,
      availablePlayers,
      isPremium: slot.isPremium || false,
    };

    return { gameTimeSlotId: query.gameTimeSlotId, available: availablePlayers >= query.playerCount, snapshot };
  }

  async reserve(req: ReserveRequest): Promise<ReserveResult> {
    const client = this.ensureClient();
    const resp = await firstValueFrom(
      client.send('slot.reserve', {
        bookingId: req.bookingId,
        gameTimeSlotId: req.gameTimeSlotId,
        playerCount: req.playerCount,
        requestedAt: req.requestedAt,
      }).pipe(timeout(5000), catchError((err) => { throw new Error(`slot.reserve failed: ${err.message}`); })),
    );
    if (!resp?.success) {
      throw new Error(`slot.reserve rejected for slot ${req.gameTimeSlotId}`);
    }
    const { snapshot } = await this.getAvailability({
      clubId: req.clubId, gameTimeSlotId: req.gameTimeSlotId, playerCount: req.playerCount,
    });
    return { reservationRef: String(req.bookingId), reserved: true, snapshot };
  }

  async cancel(ref: ReservationRef): Promise<void> {
    const client = this.ensureClient();
    await firstValueFrom(
      client.send('slot.release', {
        bookingId: ref.bookingId,
        gameTimeSlotId: ref.gameTimeSlotId,
        playerCount: ref.playerCount,
        reason: ref.reason || 'release',
        requestedAt: new Date().toISOString(),
      }).pipe(timeout(5000), catchError((err) => { throw new Error(`slot.release failed: ${err.message}`); })),
    );
  }

  async confirm(_ref: ReservationRef): Promise<ConfirmResult> {
    // club-service 슬롯 확정은 reserve 시점에 점유 확정됨 — 별도 confirm subject 없음.
    return { confirmed: true };
  }

  /** 슬롯 점유 해제 (fire-and-forget) — 그룹/팀 취소 경로용. */
  releaseSlot(gameTimeSlotId: number, playerCount: number): void {
    if (!this.club) return;
    this.club.emit('gameTimeSlots.release', { timeSlotId: gameTimeSlotId, playerCount });
  }

  /**
   * 회원의 클럽 소속 등록 (club.findOne → companyId → iam.companyMembers.addByBooking).
   * club+iam을 함께 래핑하는 1st-party 전용 — 인벤토리 계약 밖.
   */
  async registerCompanyMember(clubId: number | null, userId: number | null): Promise<void> {
    if (!clubId || !userId || !this.club || !this.iam) return;
    try {
      const clubResp = await firstValueFrom(this.club.send('club.findOne', { id: clubId }));
      const companyId = clubResp?.data?.companyId;
      if (!companyId) return;
      await firstValueFrom(this.iam.send('iam.companyMembers.addByBooking', { companyId, userId }));
      this.logger.log(`CompanyMember registered: companyId=${companyId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to register CompanyMember: clubId=${clubId}, userId=${userId}: ${(error as Error).message}`);
    }
  }

  /**
   * 게임 메타데이터 조회 (계약 외 1st-party 전용 — gameCache 채움용).
   * 인벤토리 가용성이 아니라 club-service 게임 정보이므로 IInventoryProvider 밖의 public 메서드.
   */
  async getGame(gameId: number): Promise<ClubGameInfo | null> {
    const client = this.ensureClient();
    try {
      const resp = await firstValueFrom(
        client.send('games.get', { gameId }).pipe(
          timeout(5000),
          catchError((err) => { throw new Error(`Failed to fetch game: ${err.message}`); }),
        ),
      );
      if (!resp?.success || !resp?.data) return null;
      const g = resp.data;
      return {
        gameId,
        name: g.name || '',
        code: g.code || '',
        clubId: g.clubId || 0,
        clubName: g.clubName || '',
        frontNineCourseId: g.frontNineCourseId || 0,
        frontNineCourseName: g.frontNineCourseName || '',
        backNineCourseId: g.backNineCourseId || 0,
        backNineCourseName: g.backNineCourseName || '',
        basePrice: g.basePrice || 0,
      };
    } catch (error) {
      this.logger.warn(`getGame ${gameId} failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async fetchGame(gameId: number): Promise<{ clubId: number; clubName: string } | null> {
    const game = await this.getGame(gameId);
    return game ? { clubId: game.clubId, clubName: game.clubName } : null;
  }
}

/** club-service 게임 메타데이터 (gameCache 채움용). */
export interface ClubGameInfo {
  gameId: number;
  name: string;
  code: string;
  clubId: number;
  clubName: string;
  frontNineCourseId: number;
  frontNineCourseName: string;
  backNineCourseId: number;
  backNineCourseName: string;
  basePrice: number;
}

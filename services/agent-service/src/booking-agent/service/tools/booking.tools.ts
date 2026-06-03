import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { createHash } from 'node:crypto';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const REQUEST_TIMEOUT = 10000;
// saga 트리거 호출(CREATE_BOOKING 등 다단계 step) — 전체 saga 완료까지 대기.
const SAGA_TIMEOUT = 60000;

@Injectable()
export class BookingTools {
  private readonly logger = new Logger(BookingTools.name);

  constructor(
    @Inject('CLUB_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  async getAvailableSlots(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, date, timePreference } = args as {
      clubId: string;
      date: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    const id = Number(clubId);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        error: 'INVALID_CLUB_ID',
        message: `clubId "${clubId}"는 유효한 골프장 ID가 아닙니다. 임의로 ID를 만들지 말고 search_clubs(날짜 있으면 search_clubs_with_slots)로 골프장 이름을 검색해 실제 숫자 ID를 먼저 확보하세요.`,
      };
    }

    const timeOfDayMap: Record<string, string> = {
      morning: 'MORNING',
      afternoon: 'AFTERNOON',
      evening: 'EVENING',
    };

    const response = await firstValueFrom(
      this.courseClient
        .send('games.search', {
          clubId: id,
          date,
          timeOfDay: timePreference ? timeOfDayMap[timePreference] : undefined,
          limit: 50,
        })
        .pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err) => {
            throw new Error(`Failed to get available slots: ${err.message}`);
          }),
        ),
    );

    if (response?.success && response?.data?.length) {
      const firstGame = response.data[0];
      const club = firstGame.club;

      const rounds: any[] = [];
      const allSlots: any[] = [];

      for (const game of response.data) {
        const slots = game.timeSlots || [];
        if (slots.length === 0) continue;

        const roundSlots = slots.map((slot: any) => ({
          id: slot.id,
          time: slot.startTime,
          endTime: slot.endTime,
          availableSpots: slot.availablePlayers ?? (slot.maxPlayers - slot.bookedPlayers),
          price: Number(slot.price),
        }));
        roundSlots.sort((a: any, b: any) => a.time.localeCompare(b.time));

        rounds.push({
          gameId: game.id,
          name: game.name,
          price: Number(roundSlots[0]?.price || 0),
          slots: roundSlots,
        });

        for (const slot of roundSlots) {
          allSlots.push({ ...slot, gameName: game.name });
        }
      }

      allSlots.sort((a, b) => a.time.localeCompare(b.time));

      return {
        clubName: club?.name || '',
        clubAddress: club?.address || '',
        date,
        availableCount: allSlots.length,
        rounds,
        slots: allSlots.slice(0, 10),
      };
    }

    return { date, availableCount: 0, rounds: [], slots: [] };
  }

  async createBooking(args: Record<string, unknown>): Promise<unknown> {
    const {
      gameTimeSlotId,
      playerCount,
      userId,
      userName,
      userEmail,
      paymentMethod,
      teamMembers,
      chatRoomId,
    } = args as {
      gameTimeSlotId: number;
      playerCount: number;
      userId: number;
      userName?: string;
      userEmail?: string;
      paymentMethod?: string;
      teamMembers?: Array<{ userId: number; userName?: string; userEmail?: string }>;
      chatRoomId?: string;
    };

    // gameTimeSlotId 검증 — LLM 환각으로 존재하지 않는 id가 들어와 saga 무의미하게 시작되는 것 방지
    const slotIdNum = Number(gameTimeSlotId);
    if (!Number.isInteger(slotIdNum) || slotIdNum <= 0) {
      return {
        success: false,
        error: 'INVALID_SLOT_ID',
        message: `gameTimeSlotId "${gameTimeSlotId}"는 유효한 타임슬롯 ID가 아닙니다. 임의로 ID를 만들지 말고 get_available_slots / search_clubs_with_slots / get_nearby_clubs 결과의 실제 숫자 ID만 사용하세요.`,
      };
    }

    const response = await firstValueFrom(
      this.bookingClient
        .send('saga.booking.create', {
          // 결정적 멱등키 — 동일 (사용자·슬롯·인원·결제수단) 재시도는 같은 키로 묶여
          // saga-service가 중복 제거. (이전 randomUUID는 재시도마다 새 키 → 이중 예약 위험)
          // 동일 타임슬롯을 같은 인원·결제수단으로 2번 예약하는 것은 비정상 케이스이므로 dedup 허용.
          idempotencyKey: this.buildIdempotencyKey(slotIdNum, userId, playerCount, paymentMethod),
          userId,
          userName: userName || '',
          userEmail: userEmail || '',
          gameTimeSlotId: slotIdNum,
          playerCount,
          paymentMethod: paymentMethod || 'onsite',
          teamMembers,
          chatRoomId,
        })
        .pipe(
          timeout(SAGA_TIMEOUT),
          catchError((err) => {
            throw new Error(`Failed to create booking: ${err.message}`);
          }),
        ),
    );

    const sagaMeta = response?.saga;
    const sagaStatus = sagaMeta?.status;

    if (sagaStatus === 'FAILED' || sagaStatus === 'COMPENSATED' || sagaStatus === 'REQUIRES_MANUAL') {
      return {
        success: false,
        message: sagaMeta?.failReason || '슬롯 예약에 실패했습니다. 다른 시간을 선택해 주세요.',
      };
    }

    if (response?.success && response?.data) {
      const sagaData = response.data as Record<string, unknown>;
      const bookingId = (sagaData.bookingId as number) || (sagaData.id as number);

      if (!bookingId) {
        this.logger.error(
          `[createBooking] No bookingId in saga response: ${JSON.stringify(sagaData).slice(0, 300)}`,
        );
        return { success: false, message: '예약 생성에 실패했습니다. 다시 시도해 주세요.' };
      }

      const finalStatus = await this.waitForSagaCompletion(bookingId, paymentMethod);

      if (finalStatus === 'FAILED') {
        return { success: false, message: '슬롯 예약에 실패했습니다. 다른 시간을 선택해 주세요.' };
      }

      return {
        success: true,
        bookingId,
        bookingNumber: sagaData.bookingNumber,
        confirmationNumber: sagaData.bookingNumber,
        status: finalStatus,
        message: finalStatus === 'CONFIRMED' ? '예약이 완료되었습니다!' : '결제를 진행해 주세요.',
        details: {
          date: sagaData.bookingDate,
          time: sagaData.startTime,
          playerCount: sagaData.playerCount,
          totalPrice: sagaData.totalPrice,
        },
        splits: (sagaData.splits as unknown[]) ?? undefined,
      };
    }

    return { success: false, message: sagaMeta?.failReason || '예약에 실패했습니다' };
  }

  /**
   * 결정적 멱등키 — 같은 예약 의도(슬롯·사용자·인원·결제수단)는 항상 같은 키.
   * 네트워크 재시도/중복 호출이 saga-service에서 dedup 되도록.
   */
  private buildIdempotencyKey(
    slotId: number,
    userId: number,
    playerCount: number,
    paymentMethod?: string,
  ): string {
    const raw = `booking:${userId}:${slotId}:${playerCount}:${paymentMethod || 'onsite'}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  private async waitForSagaCompletion(bookingId: number, paymentMethod?: string): Promise<string> {
    const POLL_INTERVAL = 300;
    const MAX_ATTEMPTS = 20;
    const targetStatus = !paymentMethod || paymentMethod === 'onsite' ? 'CONFIRMED' : 'SLOT_RESERVED';

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

      try {
        const response = await firstValueFrom(
          this.bookingClient.send('booking.findById', { id: bookingId }).pipe(
            timeout(5000),
            catchError((err) => {
              // 폴링 1회 실패는 치명적이지 않음(다음 시도) — 단 silent swallow 금지, 가시화.
              this.logger.warn(
                `Saga poll attempt failed (booking ${bookingId}): ${err instanceof Error ? err.message : 'unknown'}`,
              );
              return [null];
            }),
          ),
        );
        const status = response?.data?.status;
        if (status === targetStatus || status === 'CONFIRMED') return status;
        if (status === 'FAILED') return 'FAILED';
      } catch (err: unknown) {
        this.logger.warn(
          `Saga poll unexpected error (booking ${bookingId}): ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // 타임아웃 — 미확정. 호출부(direct-action-handler)가 "처리 중" 안내로 graceful degradation.
    this.logger.warn(`Saga polling timeout for booking ${bookingId} — returning PENDING (미확정)`);
    return 'PENDING';
  }

  async getBookingPolicy(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, policyType = 'all' } = args as { clubId: string; policyType?: string };

    const clubResponse = await firstValueFrom(
      this.courseClient.send('club.findOne', { id: Number(clubId) }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get club info: ${err.message}`);
        }),
      ),
    );

    const club = clubResponse?.success ? clubResponse.data : null;
    const companyId = club?.companyId;

    const resolvePayload = { scopeLevel: 'CLUB', companyId: companyId || undefined, clubId };
    const results: Record<string, unknown> = {};
    const policyRequests: Array<{ key: string; pattern: string }> = [];

    if (policyType === 'all' || policyType === 'operating') policyRequests.push({ key: 'operating', pattern: 'policy.operating.resolve' });
    if (policyType === 'all' || policyType === 'cancellation') policyRequests.push({ key: 'cancellation', pattern: 'policy.cancellation.resolve' });
    if (policyType === 'all' || policyType === 'refund') policyRequests.push({ key: 'refund', pattern: 'policy.refund.resolve' });
    if (policyType === 'all' || policyType === 'noshow') policyRequests.push({ key: 'noshow', pattern: 'policy.noshow.resolve' });

    await Promise.all(
      policyRequests.map(async ({ key, pattern }) => {
        try {
          const response = await firstValueFrom(
            this.bookingClient.send(pattern, resolvePayload).pipe(
              timeout(REQUEST_TIMEOUT),
              catchError(() => [{ success: false }]),
            ),
          );
          if (response?.success && response?.data) results[key] = response.data;
        } catch {
          this.logger.warn(`Failed to resolve ${key} policy for club ${clubId}`);
        }
      }),
    );

    return { clubId, clubName: club?.name, policies: results };
  }

  async getUserRecentBookings(
    userId: number,
    limit = 5,
  ): Promise<
    Array<{
      bookingId: number;
      clubId: number | null;
      clubName: string | null;
      date: string | null;
      startTime: string | null;
      playerCount: number;
      paymentMethod: string | null;
      status: string;
      createdAt: string;
    }>
  > {
    try {
      const response = await firstValueFrom(
        this.bookingClient
          .send<{ success: boolean; data: any[] }>('booking.findByUserId', { userId })
          .pipe(
            timeout(REQUEST_TIMEOUT),
            catchError((err) => {
              this.logger.warn(`booking.findByUserId failed: ${err.message}`);
              return [null];
            }),
          ),
      );

      if (!response?.success || !Array.isArray(response.data)) return [];

      const sorted = [...response.data].sort((a, b) => {
        const da = new Date(b.createdAt ?? 0).getTime();
        const db = new Date(a.createdAt ?? 0).getTime();
        return da - db;
      });

      return sorted.slice(0, limit).map((b) => ({
        bookingId: b.id,
        clubId: b.clubId ?? null,
        clubName: b.clubName ?? null,
        date: b.date ?? null,
        startTime: b.startTime ?? null,
        playerCount: b.playerCount ?? 0,
        paymentMethod: b.paymentMethod ?? null,
        status: b.status,
        createdAt: b.createdAt,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`getUserRecentBookings error: ${msg}`);
      return [];
    }
  }

  async getBookingBookerId(bookingId: number): Promise<number | undefined> {
    const detail = await this.getBookingDetail(bookingId);
    return detail?.userId || undefined;
  }

  async getBookingDetail(bookingId: number): Promise<{
    userId: number;
    status: string;
    bookingNumber: string;
    gameName: string;
    clubName: string;
    bookingDate: string;
    startTime: string;
    totalPrice: number;
    paymentMethod: string;
  } | null> {
    try {
      const response = await firstValueFrom(
        this.bookingClient.send('booking.findById', { id: bookingId }).pipe(
          timeout(5000),
          catchError(() => [null]),
        ),
      );
      if (!response?.data) return null;
      const d = response.data;
      return {
        userId: d.userId,
        status: d.status || '',
        bookingNumber: d.bookingNumber || '',
        gameName: d.gameName || '',
        clubName: d.clubName || '',
        bookingDate: d.bookingDate || '',
        startTime: d.startTime || '',
        totalPrice: Number(d.totalPrice) || 0,
        paymentMethod: d.paymentMethod || '',
      };
    } catch {
      return null;
    }
  }

  async getSettlementStatus(bookingId: number): Promise<{
    allPaid: boolean;
    paidCount: number;
    totalCount: number;
    bookingStatus: string;
    settlementStatus: string;
  } | null> {
    try {
      const response = await firstValueFrom(
        this.bookingClient.send('booking.settlementStatus', { bookingId }).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError(() => [null]),
        ),
      );

      if (response?.success && response?.data) {
        return {
          allPaid: response.data.allPaid,
          paidCount: response.data.paidCount,
          totalCount: response.data.totalCount,
          bookingStatus: response.data.bookingStatus,
          settlementStatus: response.data.settlementStatus,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

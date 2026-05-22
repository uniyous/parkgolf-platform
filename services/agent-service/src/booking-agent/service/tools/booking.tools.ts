import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const REQUEST_TIMEOUT = 10000;
// saga 트리거 호출(CREATE_BOOKING 등 다단계 step) — 전체 saga 완료까지 대기.
const SAGA_TIMEOUT = 60000;

@Injectable()
export class BookingTools {
  private readonly logger = new Logger(BookingTools.name);

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  async getAvailableSlots(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, date, timePreference } = args as {
      clubId: string;
      date: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    const timeOfDayMap: Record<string, string> = {
      morning: 'MORNING',
      afternoon: 'AFTERNOON',
      evening: 'EVENING',
    };

    const response = await firstValueFrom(
      this.courseClient
        .send('games.search', {
          clubId: Number(clubId),
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

    const response = await firstValueFrom(
      this.bookingClient
        .send('saga.booking.create', {
          idempotencyKey: crypto.randomUUID(),
          userId,
          userName: userName || '',
          userEmail: userEmail || '',
          gameTimeSlotId,
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
            catchError(() => [null]),
          ),
        );
        const status = response?.data?.status;
        if (status === targetStatus || status === 'CONFIRMED') return status;
        if (status === 'FAILED') return 'FAILED';
      } catch {
        // retry
      }
    }

    this.logger.warn(`Saga polling timeout for booking ${bookingId}`);
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

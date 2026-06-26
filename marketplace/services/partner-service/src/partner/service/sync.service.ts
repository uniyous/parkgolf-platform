import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { eq, and, inArray, notInArray, gte, desc, asc, count } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { partnerConfigs, gameMappings, slotMappings, bookingMappings, syncLogs } from '../../db/schema';
import { SyncAction, SyncDirection, SyncResult as SyncResultEnum, SlotSyncStatus, BookingSyncStatus } from '../../contracts/enums';
import { PartnerConfigService } from './partner-config.service';
import { GameMappingService } from './game-mapping.service';
import { PartnerClientService, ExternalSlotData, ExternalBookingData } from '../../client/partner-client.service';
import { PartnerResilienceService } from '../../client/partner-resilience.service';
import { NATS_TIMEOUTS } from '../../common/constants';

export interface SyncResult {
  partnerId: number;
  systemName: string;
  action: 'SLOT_SYNC' | 'BOOKING_IMPORT';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  durationMs: number;
  errorMessage?: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly partnerConfigService: PartnerConfigService,
    private readonly gameMappingService: GameMappingService,
    private readonly partnerClientService: PartnerClientService,
    private readonly resilienceService: PartnerResilienceService,
    @Inject('CLUB_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async syncAll(): Promise<{ results: SyncResult[]; summary: { total: number; success: number; failed: number } }> {
    this.logger.log('[syncAll] Starting full partner sync...');
    const results: SyncResult[] = [];

    const slotPartners = await this.partnerConfigService.findActiveForSync('slot');
    for (const partner of slotPartners) {
      try {
        results.push(await this.resilienceService.call(partner.id, () => this.syncSlots(partner.id)));
      } catch (error) {
        this.logger.error(`[syncAll] Slot sync failed for partner ${partner.id}: ${error.message}`);
        results.push({ partnerId: partner.id, systemName: partner.systemName, action: 'SLOT_SYNC', status: 'FAILED', recordCount: 0, createdCount: 0, updatedCount: 0, errorCount: 1, durationMs: 0, errorMessage: error.message });
      }
    }

    const bookingPartners = await this.partnerConfigService.findActiveForSync('booking');
    for (const partner of bookingPartners) {
      try {
        results.push(await this.resilienceService.call(partner.id, () => this.syncBookings(partner.id)));
      } catch (error) {
        this.logger.error(`[syncAll] Booking sync failed for partner ${partner.id}: ${error.message}`);
        results.push({ partnerId: partner.id, systemName: partner.systemName, action: 'BOOKING_IMPORT', status: 'FAILED', recordCount: 0, createdCount: 0, updatedCount: 0, errorCount: 1, durationMs: 0, errorMessage: error.message });
      }
    }

    const summary = { total: results.length, success: results.filter((r) => r.status === 'SUCCESS').length, failed: results.filter((r) => r.status === 'FAILED').length };
    this.logger.log(`[syncAll] Completed: ${JSON.stringify(summary)}`);
    return { results, summary };
  }

  async syncSlots(partnerId: number): Promise<SyncResult> {
    const startTime = Date.now();
    const partner = await this.db.query.partnerConfigs.findFirst({
      where: eq(partnerConfigs.id, partnerId),
      with: { gameMappings: { where: eq(gameMappings.isActive, true) } },
    });
    if (!partner) throw new Error(`PartnerConfig ${partnerId} not found`);

    let recordCount = 0, createdCount = 0, updatedCount = 0, errorCount = 0;
    const errors: string[] = [];

    try {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + partner.syncRangeDays * 86400000).toISOString().split('T')[0];
      this.logger.log(`[syncSlots] Partner ${partnerId}: fetching slots ${startDate} ~ ${endDate}`);

      const externalSlots = await this.partnerClientService.fetchSlots(partnerId, startDate, endDate);
      recordCount = externalSlots.length;
      this.logger.log(`[syncSlots] Partner ${partnerId}: ${recordCount} slots fetched`);

      for (const slot of externalSlots) {
        try {
          const result = await this.processSlot(partner, slot);
          if (result === 'created') createdCount++;
          else if (result === 'updated') updatedCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Slot ${slot.externalSlotId}: ${error.message}`);
          this.logger.warn(`[syncSlots] Error processing slot ${slot.externalSlotId}: ${error.message}`);
        }
      }

      const externalSlotIds = externalSlots.map((s) => s.externalSlotId);
      const gameMappingIds = partner.gameMappings.map((gm) => gm.id);

      if (gameMappingIds.length > 0) {
        const staleSlotMappings = await this.db
          .select()
          .from(slotMappings)
          .where(and(
            inArray(slotMappings.gameMappingId, gameMappingIds),
            notInArray(slotMappings.externalSlotId, externalSlotIds),
            inArray(slotMappings.syncStatus, [SlotSyncStatus.SYNCED, SlotSyncStatus.PENDING]),
            gte(slotMappings.date, new Date(startDate)),
          ));

        for (const stale of staleSlotMappings) {
          try {
            if (stale.internalSlotId) {
              await firstValueFrom(
                this.courseClient.send('slot.closeExternal', { gameTimeSlotId: stale.internalSlotId }).pipe(
                  timeout(NATS_TIMEOUTS.DEFAULT),
                  catchError((err) => { throw new Error(`slot.closeExternal 실패: ${err.message}`); }),
                ),
              );
            }
            await this.db.update(slotMappings).set({ syncStatus: SlotSyncStatus.FAILED, syncError: '외부 슬롯 삭제됨' }).where(eq(slotMappings.id, stale.id));
            this.logger.log(`[syncSlots] Closed stale slot: mapping=${stale.id}, internalSlot=${stale.internalSlotId}`);
          } catch (error) {
            this.logger.warn(`[syncSlots] Failed to close stale slot ${stale.id}: ${error.message}`);
          }
        }
      }

      const status = errorCount === 0 ? 'SUCCESS' : errorCount < recordCount ? 'PARTIAL' : 'FAILED';
      const durationMs = Date.now() - startTime;

      await this.db.update(partnerConfigs).set({
        lastSlotSyncAt: new Date(),
        lastSlotSyncStatus: status,
        lastSlotSyncError: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      }).where(eq(partnerConfigs.id, partnerId));

      await this.createSyncLog({ partnerId, action: 'SLOT_SYNC', direction: 'INBOUND', status, recordCount, createdCount, updatedCount, errorCount, errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null, durationMs });

      const result: SyncResult = { partnerId, systemName: partner.systemName, action: 'SLOT_SYNC', status, recordCount, createdCount, updatedCount, errorCount, durationMs, errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined };
      this.logger.log(`[syncSlots] Partner ${partnerId} done: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.db.update(partnerConfigs).set({ lastSlotSyncAt: new Date(), lastSlotSyncStatus: 'FAILED', lastSlotSyncError: error.message }).where(eq(partnerConfigs.id, partnerId));
      await this.createSyncLog({ partnerId, action: 'SLOT_SYNC', direction: 'INBOUND', status: 'FAILED', recordCount: 0, createdCount: 0, updatedCount: 0, errorCount: 1, errorMessage: error.message, durationMs });
      throw error;
    }
  }

  async syncBookings(partnerId: number): Promise<SyncResult> {
    const startTime = Date.now();
    const [partner] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.id, partnerId)).limit(1);
    if (!partner) throw new Error(`PartnerConfig ${partnerId} not found`);

    let recordCount = 0, createdCount = 0, updatedCount = 0, errorCount = 0;
    const errors: string[] = [];

    try {
      const since = partner.lastBookingSyncAt || new Date(Date.now() - 86400000);
      this.logger.log(`[syncBookings] Partner ${partnerId}: fetching bookings since ${since.toISOString()}`);

      const externalBookings = await this.partnerClientService.fetchBookings(partnerId, since);
      recordCount = externalBookings.length;
      this.logger.log(`[syncBookings] Partner ${partnerId}: ${recordCount} bookings fetched`);

      for (const booking of externalBookings) {
        try {
          const result = await this.processBooking(partnerId, booking);
          if (result === 'created') createdCount++;
          else if (result === 'updated') updatedCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Booking ${booking.externalBookingId}: ${error.message}`);
          this.logger.warn(`[syncBookings] Error processing booking ${booking.externalBookingId}: ${error.message}`);
        }
      }

      const status = errorCount === 0 ? 'SUCCESS' : errorCount < recordCount ? 'PARTIAL' : 'FAILED';
      const durationMs = Date.now() - startTime;

      await this.db.update(partnerConfigs).set({ lastBookingSyncAt: new Date() }).where(eq(partnerConfigs.id, partnerId));
      await this.createSyncLog({ partnerId, action: 'BOOKING_IMPORT', direction: 'INBOUND', status, recordCount, createdCount, updatedCount, errorCount, errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null, durationMs });

      const result: SyncResult = { partnerId, systemName: partner.systemName, action: 'BOOKING_IMPORT', status, recordCount, createdCount, updatedCount, errorCount, durationMs, errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined };
      this.logger.log(`[syncBookings] Partner ${partnerId} done: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.createSyncLog({ partnerId, action: 'BOOKING_IMPORT', direction: 'INBOUND', status: 'FAILED', recordCount: 0, createdCount: 0, updatedCount: 0, errorCount: 1, errorMessage: error.message, durationMs });
      throw error;
    }
  }

  // ── Private ──

  private async processSlot(
    partner: { id: number; gameMappings: Array<{ id: number; externalCourseName: string; internalGameId: number }> },
    slot: ExternalSlotData,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const gameMapping = partner.gameMappings.find((m) => m.externalCourseName === slot.courseName);
    if (!gameMapping) {
      this.logger.debug(`[processSlot] No mapping for courseName "${slot.courseName}", skipping`);
      return 'skipped';
    }

    const [existing] = await this.db
      .select()
      .from(slotMappings)
      .where(and(eq(slotMappings.gameMappingId, gameMapping.id), eq(slotMappings.externalSlotId, slot.externalSlotId)))
      .limit(1);

    const slotData = {
      externalMaxPlayers: slot.maxPlayers,
      externalBooked: slot.bookedPlayers,
      externalStatus: slot.status,
      externalPrice: slot.price != null ? String(slot.price) : null,
      lastSyncAt: new Date(),
      syncStatus: SlotSyncStatus.SYNCED,
      syncError: null,
    };

    let slotMapping;
    let action: 'created' | 'updated';

    if (existing) {
      [slotMapping] = await this.db.update(slotMappings).set(slotData).where(eq(slotMappings.id, existing.id)).returning();
      action = 'updated';
    } else {
      [slotMapping] = await this.db
        .insert(slotMappings)
        .values({ gameMappingId: gameMapping.id, externalSlotId: slot.externalSlotId, date: new Date(slot.date), startTime: slot.startTime, endTime: slot.endTime, ...slotData })
        .returning();
      action = 'created';
    }

    await this.syncGameTimeSlot(slotMapping, gameMapping.internalGameId, slot);
    return action;
  }

  private async syncGameTimeSlot(
    slotMapping: { id: number; internalSlotId: number | null },
    internalGameId: number,
    slot: ExternalSlotData,
  ): Promise<void> {
    try {
      if (slotMapping.internalSlotId) {
        await this.updateGameTimeSlot(slotMapping.internalSlotId, slot);
      } else {
        const matchResult = await firstValueFrom(
          this.courseClient.send('gameTimeSlots.getByGameAndDate', { gameId: internalGameId, date: slot.date }).pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => { throw new Error(`club-service 조회 실패: ${err.message}`); }),
          ),
        );

        if (matchResult?.success && Array.isArray(matchResult.data)) {
          const matched = matchResult.data.find((s: { startTime: string }) => s.startTime === slot.startTime);
          if (matched) {
            await this.db.update(slotMappings).set({ internalSlotId: matched.id, syncStatus: SlotSyncStatus.SYNCED }).where(eq(slotMappings.id, slotMapping.id));
            await this.updateGameTimeSlot(matched.id, slot);
          } else {
            const createResult = await firstValueFrom(
              this.courseClient.send('slot.createFromPartner', {
                gameId: internalGameId, date: slot.date, startTime: slot.startTime, endTime: slot.endTime, maxPlayers: slot.maxPlayers, price: slot.price || 0, externalBooked: slot.bookedPlayers,
              }).pipe(
                timeout(NATS_TIMEOUTS.DEFAULT),
                catchError((err) => { throw new Error(`GameTimeSlot 자동 생성 실패: ${err.message}`); }),
              ),
            );
            if (createResult?.success && createResult.data?.id) {
              await this.db.update(slotMappings).set({ internalSlotId: createResult.data.id, syncStatus: SlotSyncStatus.SYNCED }).where(eq(slotMappings.id, slotMapping.id));
              this.logger.log(`[syncGameTimeSlot] Auto-created GameTimeSlot ${createResult.data.id} for external slot ${slot.externalSlotId}`);
            } else {
              await this.db.update(slotMappings).set({ syncStatus: SlotSyncStatus.UNMAPPED }).where(eq(slotMappings.id, slotMapping.id));
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`[syncGameTimeSlot] Failed to sync with club-service: ${error.message}`);
      await this.db.update(slotMappings).set({ syncStatus: SlotSyncStatus.FAILED, syncError: error.message }).where(eq(slotMappings.id, slotMapping.id));
    }
  }

  private async updateGameTimeSlot(internalSlotId: number, slot: ExternalSlotData): Promise<void> {
    await firstValueFrom(
      this.courseClient.send('slot.updateExternalBooked', { timeSlotId: internalSlotId, externalBooked: slot.bookedPlayers }).pipe(
        timeout(NATS_TIMEOUTS.DEFAULT),
        catchError((err) => { throw new Error(`GameTimeSlot externalBooked 업데이트 실패: ${err.message}`); }),
      ),
    );
  }

  private async processBooking(partnerId: number, booking: ExternalBookingData): Promise<'created' | 'updated' | 'skipped'> {
    const [existing] = await this.db
      .select()
      .from(bookingMappings)
      .where(and(eq(bookingMappings.partnerId, partnerId), eq(bookingMappings.externalBookingId, booking.externalBookingId)))
      .limit(1);

    const gameMapping = booking.courseName
      ? (await this.db.select().from(gameMappings).where(and(eq(gameMappings.partnerId, partnerId), eq(gameMappings.externalCourseName, booking.courseName), eq(gameMappings.isActive, true))).limit(1))[0]
      : null;

    const parsedDate = booking.date ? new Date(booking.date) : null;
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      this.logger.warn(`[processBooking] Invalid date "${booking.date}" for booking ${booking.externalBookingId}, skipping`);
      return 'skipped';
    }

    const bookingData = { date: parsedDate, startTime: booking.startTime, playerCount: booking.playerCount, playerName: booking.playerName, status: booking.status, lastSyncAt: new Date() };

    if (existing) {
      const hasConflict = existing.status !== booking.status || existing.playerCount !== booking.playerCount;
      if (hasConflict && existing.syncStatus === BookingSyncStatus.SYNCED) {
        await this.db.update(bookingMappings).set({
          ...bookingData,
          syncStatus: BookingSyncStatus.CONFLICT,
          conflictData: {
            internal: { status: existing.status, playerCount: existing.playerCount },
            external: { status: booking.status, playerCount: booking.playerCount },
            detectedAt: new Date().toISOString(),
          },
        }).where(eq(bookingMappings.id, existing.id));
        return 'updated';
      }
      await this.db.update(bookingMappings).set({ ...bookingData, syncStatus: BookingSyncStatus.SYNCED }).where(eq(bookingMappings.id, existing.id));
      return 'updated';
    }

    await this.db.insert(bookingMappings).values({
      partnerId, gameMappingId: gameMapping?.id ?? null, externalBookingId: booking.externalBookingId, syncDirection: 'INBOUND', syncStatus: 'SYNCED', ...bookingData,
    });
    return 'created';
  }

  // ── Saga Step ──

  async verifySlotAvailability(data: { clubId: number; gameTimeSlotId: number; playerCount: number; bookingDate: string; startTime: string }): Promise<{ available: boolean; externalSlotId?: string; message?: string }> {
    const [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.clubId, data.clubId)).limit(1);
    if (!config || !config.isActive) return { available: true, message: '파트너 설정 없음 — 내부 예약으로 진행' };

    const [slotMapping] = await this.db
      .select()
      .from(slotMappings)
      .where(and(eq(slotMappings.internalSlotId, data.gameTimeSlotId), inArray(slotMappings.syncStatus, [SlotSyncStatus.SYNCED, SlotSyncStatus.PENDING])))
      .limit(1);
    if (!slotMapping) return { available: true, message: '외부 슬롯 매핑 없음 — 내부 예약으로 진행' };

    const externalAvailable = slotMapping.externalMaxPlayers - slotMapping.externalBooked;
    if (externalAvailable < data.playerCount) {
      return { available: false, externalSlotId: slotMapping.externalSlotId, message: `외부 시스템 가용 인원 부족: ${externalAvailable} < ${data.playerCount}` };
    }

    try {
      const slots = await this.resilienceService.call(config.id, () => this.partnerClientService.fetchSlots(config.id, data.bookingDate, data.bookingDate));
      const matchedSlot = slots.find((s) => s.startTime === data.startTime && s.externalSlotId === slotMapping.externalSlotId);
      if (matchedSlot) {
        const realAvailable = matchedSlot.maxPlayers - matchedSlot.bookedPlayers;
        if (realAvailable < data.playerCount) {
          return { available: false, externalSlotId: slotMapping.externalSlotId, message: `외부 실시간 가용 인원 부족: ${realAvailable} < ${data.playerCount}` };
        }
      }
    } catch (error) {
      this.logger.warn(`[verifySlotAvailability] Real-time check failed, using cached data: ${error.message}`);
    }

    return { available: true, externalSlotId: slotMapping.externalSlotId };
  }

  async notifyBookingCreated(data: { clubId: number; bookingId: number; bookingNumber: string; externalSlotId?: string; playerCount: number; playerName?: string; bookingDate: string; startTime: string }): Promise<{ externalBookingId?: string; status: string }> {
    const [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.clubId, data.clubId)).limit(1);
    if (!config || !config.isActive) return { status: 'SKIPPED' };

    try {
      const result = await this.resilienceService.call(config.id, () =>
        this.partnerClientService.createBooking(config.id, { slotId: data.externalSlotId || '', playerCount: data.playerCount, playerName: data.playerName || '', referenceId: data.bookingNumber }),
      );

      await this.db.insert(bookingMappings).values({
        partnerId: config.id, internalBookingId: data.bookingId, externalBookingId: result.externalBookingId, syncDirection: 'OUTBOUND', syncStatus: 'SYNCED', lastSyncAt: new Date(),
        date: new Date(data.bookingDate), startTime: data.startTime, playerCount: data.playerCount, playerName: data.playerName, status: 'CONFIRMED',
      });

      await this.createSyncLog({ partnerId: config.id, action: 'BOOKING_EXPORT', direction: 'OUTBOUND', status: 'SUCCESS', recordCount: 1, createdCount: 1, updatedCount: 0, errorCount: 0, errorMessage: null, durationMs: 0 });
      return { externalBookingId: result.externalBookingId, status: 'CREATED' };
    } catch (error) {
      this.logger.error(`[notifyBookingCreated] Failed: ${error.message}`);
      await this.createSyncLog({ partnerId: config.id, action: 'BOOKING_EXPORT', direction: 'OUTBOUND', status: 'FAILED', recordCount: 1, createdCount: 0, updatedCount: 0, errorCount: 1, errorMessage: error.message, durationMs: 0 });
      throw error;
    }
  }

  async notifyBookingCancelled(data: { clubId: number; bookingId: number; bookingNumber: string; cancelReason?: string }): Promise<{ status: string }> {
    const [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.clubId, data.clubId)).limit(1);
    if (!config || !config.isActive) return { status: 'SKIPPED' };

    const [mapping] = await this.db.select().from(bookingMappings).where(and(eq(bookingMappings.partnerId, config.id), eq(bookingMappings.internalBookingId, data.bookingId))).limit(1);
    if (!mapping) {
      this.logger.warn(`[notifyBookingCancelled] No mapping for bookingId=${data.bookingId}`);
      return { status: 'NO_MAPPING' };
    }

    try {
      await this.resilienceService.call(config.id, () => this.partnerClientService.cancelBooking(config.id, mapping.externalBookingId, data.cancelReason || '예약 취소'));
      await this.db.update(bookingMappings).set({ syncStatus: BookingSyncStatus.CANCELLED, status: 'CANCELLED', lastSyncAt: new Date() }).where(eq(bookingMappings.id, mapping.id));
      await this.createSyncLog({ partnerId: config.id, action: 'BOOKING_CANCEL', direction: 'OUTBOUND', status: 'SUCCESS', recordCount: 1, createdCount: 0, updatedCount: 1, errorCount: 0, errorMessage: null, durationMs: 0 });
      return { status: 'CANCELLED' };
    } catch (error) {
      this.logger.error(`[notifyBookingCancelled] Failed: ${error.message}`);
      await this.createSyncLog({ partnerId: config.id, action: 'BOOKING_CANCEL', direction: 'OUTBOUND', status: 'FAILED', recordCount: 1, createdCount: 0, updatedCount: 0, errorCount: 1, errorMessage: error.message, durationMs: 0 });
      throw error;
    }
  }

  // ── 조회 API ──

  async getSyncLogs(params: { clubId?: number; partnerId?: number; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    let partnerId = params.partnerId ? Number(params.partnerId) : undefined;

    if (params.clubId && !partnerId) {
      const [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.clubId, Number(params.clubId))).limit(1);
      if (!config) return { data: [], total: 0, page, limit };
      partnerId = config.id;
    }

    const where = partnerId ? eq(syncLogs.partnerId, partnerId) : undefined;
    const [items, totalRows] = await Promise.all([
      this.db.select().from(syncLogs).where(where).orderBy(desc(syncLogs.createdAt)).limit(limit).offset((page - 1) * limit),
      this.db.select({ value: count() }).from(syncLogs).where(where),
    ]);
    return { data: items, total: totalRows[0].value, page, limit };
  }

  async getSlotMappings(params: { partnerId?: number; date?: string; syncStatus?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const conds = [];

    if (params.partnerId) {
      const gms = await this.db.select({ id: gameMappings.id }).from(gameMappings).where(eq(gameMappings.partnerId, Number(params.partnerId)));
      conds.push(inArray(slotMappings.gameMappingId, gms.map((gm) => gm.id)));
    }
    if (params.date) conds.push(eq(slotMappings.date, new Date(params.date)));
    if (params.syncStatus) conds.push(eq(slotMappings.syncStatus, params.syncStatus as SlotSyncStatus));
    const where = conds.length ? and(...conds) : undefined;

    const [items, totalRows] = await Promise.all([
      this.db.query.slotMappings.findMany({
        where,
        orderBy: [asc(slotMappings.date), asc(slotMappings.startTime)],
        limit,
        offset: (page - 1) * limit,
        with: { gameMapping: { columns: { externalCourseName: true, internalGameId: true } } },
      }),
      this.db.select({ value: count() }).from(slotMappings).where(where),
    ]);
    return { data: items, total: totalRows[0].value, page, limit };
  }

  async getBookingMappings(params: { clubId?: number; partnerId?: number; syncStatus?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    let partnerId = params.partnerId ? Number(params.partnerId) : undefined;

    if (params.clubId && !partnerId) {
      const [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.clubId, Number(params.clubId))).limit(1);
      if (!config) return { data: [], total: 0, page, limit };
      partnerId = config.id;
    }

    const conds = [];
    if (partnerId) conds.push(eq(bookingMappings.partnerId, partnerId));
    if (params.syncStatus) conds.push(eq(bookingMappings.syncStatus, params.syncStatus as BookingSyncStatus));
    const where = conds.length ? and(...conds) : undefined;

    const [items, totalRows] = await Promise.all([
      this.db.select().from(bookingMappings).where(where).orderBy(desc(bookingMappings.createdAt)).limit(limit).offset((page - 1) * limit),
      this.db.select({ value: count() }).from(bookingMappings).where(where),
    ]);
    return { data: items, total: totalRows[0].value, page, limit };
  }

  async manualSync(params: { partnerId?: number; clubId?: number }): Promise<SyncResult[]> {
    let config;
    if (params.partnerId) {
      [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.id, params.partnerId)).limit(1);
    } else if (params.clubId) {
      [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.clubId, params.clubId)).limit(1);
    }
    if (!config) throw new Error(`파트너 설정을 찾을 수 없습니다 (partnerId=${params.partnerId}, clubId=${params.clubId})`);

    const results: SyncResult[] = [];
    if (config.slotSyncEnabled) results.push(await this.syncSlots(config.id));
    if (config.bookingSyncEnabled) results.push(await this.syncBookings(config.id));
    return results;
  }

  async resolveConflict(bookingMappingId: number, resolution: { acceptSource: 'internal' | 'external' }) {
    const [mapping] = await this.db.select().from(bookingMappings).where(eq(bookingMappings.id, bookingMappingId)).limit(1);
    if (!mapping) throw new Error('BookingMapping을 찾을 수 없습니다');

    const conflictData = mapping.conflictData as Record<string, unknown> | null;
    const resolved = conflictData?.[resolution.acceptSource] as Record<string, unknown> | undefined;

    const updateData: Record<string, unknown> = { syncStatus: BookingSyncStatus.SYNCED, conflictData: null, lastSyncAt: new Date() };
    if (resolved) {
      if (resolved.status) updateData.status = resolved.status;
      if (resolved.playerCount) updateData.playerCount = resolved.playerCount;
    }

    const [row] = await this.db.update(bookingMappings).set(updateData).where(eq(bookingMappings.id, bookingMappingId)).returning();
    return row;
  }

  // ── Private ──

  private async createSyncLog(data: {
    partnerId: number;
    action: SyncAction;
    direction: SyncDirection;
    status: SyncResultEnum;
    recordCount: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    errorMessage: string | null;
    durationMs: number;
  }): Promise<void> {
    await this.db.insert(syncLogs).values({
      partnerId: data.partnerId,
      action: data.action,
      direction: data.direction,
      status: data.status,
      recordCount: data.recordCount,
      createdCount: data.createdCount,
      updatedCount: data.updatedCount,
      errorCount: data.errorCount,
      errorMessage: data.errorMessage,
      durationMs: data.durationMs,
    });
  }
}

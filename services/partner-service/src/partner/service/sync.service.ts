import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { PartnerConfigService } from './partner-config.service';
import { CourseMappingService } from './course-mapping.service';
import { PartnerClientService, ExternalSlotData, ExternalBookingData } from '../../client/partner-client.service';
import { PartnerResilienceService } from '../../client/partner-resilience.service';
import { NATS_TIMEOUTS } from '../../common/constants';
import { Prisma, SyncAction, SyncDirection, SyncResult as PrismaSyncResult } from '@prisma/client';

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
    private readonly prisma: PrismaService,
    private readonly partnerConfigService: PartnerConfigService,
    private readonly courseMappingService: CourseMappingService,
    private readonly partnerClientService: PartnerClientService,
    private readonly resilienceService: PartnerResilienceService,
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  /**
   * 전체 활성 파트너 동기화 (job-service에서 10분마다 호출)
   */
  async syncAll(): Promise<{ results: SyncResult[]; summary: { total: number; success: number; failed: number } }> {
    this.logger.log('[syncAll] Starting full partner sync...');

    const results: SyncResult[] = [];

    // 슬롯 동기화
    const slotPartners = await this.partnerConfigService.findActiveForSync('slot');
    for (const partner of slotPartners) {
      try {
        const result = await this.resilienceService.call(partner.id, () =>
          this.syncSlots(partner.id),
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`[syncAll] Slot sync failed for partner ${partner.id}: ${error.message}`);
        results.push({
          partnerId: partner.id,
          systemName: partner.systemName,
          action: 'SLOT_SYNC',
          status: 'FAILED',
          recordCount: 0,
          createdCount: 0,
          updatedCount: 0,
          errorCount: 1,
          durationMs: 0,
          errorMessage: error.message,
        });
      }
    }

    // 예약 동기화
    const bookingPartners = await this.partnerConfigService.findActiveForSync('booking');
    for (const partner of bookingPartners) {
      try {
        const result = await this.resilienceService.call(partner.id, () =>
          this.syncBookings(partner.id),
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`[syncAll] Booking sync failed for partner ${partner.id}: ${error.message}`);
        results.push({
          partnerId: partner.id,
          systemName: partner.systemName,
          action: 'BOOKING_IMPORT',
          status: 'FAILED',
          recordCount: 0,
          createdCount: 0,
          updatedCount: 0,
          errorCount: 1,
          durationMs: 0,
          errorMessage: error.message,
        });
      }
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === 'SUCCESS').length,
      failed: results.filter((r) => r.status === 'FAILED').length,
    };

    this.logger.log(`[syncAll] Completed: ${JSON.stringify(summary)}`);
    return { results, summary };
  }

  /**
   * 특정 파트너의 슬롯 동기화
   */
  async syncSlots(partnerId: number): Promise<SyncResult> {
    const startTime = Date.now();
    const partner = await this.prisma.partnerConfig.findUniqueOrThrow({
      where: { id: partnerId },
      include: { courseMappings: { where: { isActive: true } } },
    });

    let recordCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // 날짜 범위 계산
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + partner.syncRangeDays * 86400000)
        .toISOString()
        .split('T')[0];

      this.logger.log(`[syncSlots] Partner ${partnerId}: fetching slots ${startDate} ~ ${endDate}`);

      // 외부 API에서 슬롯 조회
      const externalSlots = await this.partnerClientService.fetchSlots(partnerId, startDate, endDate);
      recordCount = externalSlots.length;

      this.logger.log(`[syncSlots] Partner ${partnerId}: ${recordCount} slots fetched`);

      // 각 슬롯 처리
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

      // 동기화 상태 업데이트
      const status = errorCount === 0 ? 'SUCCESS' : errorCount < recordCount ? 'PARTIAL' : 'FAILED';
      const durationMs = Date.now() - startTime;

      await this.prisma.partnerConfig.update({
        where: { id: partnerId },
        data: {
          lastSlotSyncAt: new Date(),
          lastSlotSyncStatus: status,
          lastSlotSyncError: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
        },
      });

      // SyncLog 기록
      await this.createSyncLog({
        partnerId,
        action: 'SLOT_SYNC',
        direction: 'INBOUND',
        status,
        recordCount,
        createdCount,
        updatedCount,
        errorCount,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
        durationMs,
      });

      const result: SyncResult = {
        partnerId,
        systemName: partner.systemName,
        action: 'SLOT_SYNC',
        status,
        recordCount,
        createdCount,
        updatedCount,
        errorCount,
        durationMs,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
      };

      this.logger.log(`[syncSlots] Partner ${partnerId} done: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await this.prisma.partnerConfig.update({
        where: { id: partnerId },
        data: {
          lastSlotSyncAt: new Date(),
          lastSlotSyncStatus: 'FAILED',
          lastSlotSyncError: error.message,
        },
      });

      await this.createSyncLog({
        partnerId,
        action: 'SLOT_SYNC',
        direction: 'INBOUND',
        status: 'FAILED',
        recordCount: 0,
        createdCount: 0,
        updatedCount: 0,
        errorCount: 1,
        errorMessage: error.message,
        durationMs,
      });

      throw error;
    }
  }

  /**
   * 특정 파트너의 예약 동기화
   */
  async syncBookings(partnerId: number): Promise<SyncResult> {
    const startTime = Date.now();
    const partner = await this.prisma.partnerConfig.findUniqueOrThrow({
      where: { id: partnerId },
    });

    let recordCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // 마지막 동기화 시점부터 조회 (없으면 24시간 전)
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

      await this.prisma.partnerConfig.update({
        where: { id: partnerId },
        data: { lastBookingSyncAt: new Date() },
      });

      await this.createSyncLog({
        partnerId,
        action: 'BOOKING_IMPORT',
        direction: 'INBOUND',
        status,
        recordCount,
        createdCount,
        updatedCount,
        errorCount,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
        durationMs,
      });

      const result: SyncResult = {
        partnerId,
        systemName: partner.systemName,
        action: 'BOOKING_IMPORT',
        status,
        recordCount,
        createdCount,
        updatedCount,
        errorCount,
        durationMs,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
      };

      this.logger.log(`[syncBookings] Partner ${partnerId} done: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await this.createSyncLog({
        partnerId,
        action: 'BOOKING_IMPORT',
        direction: 'INBOUND',
        status: 'FAILED',
        recordCount: 0,
        createdCount: 0,
        updatedCount: 0,
        errorCount: 1,
        errorMessage: error.message,
        durationMs,
      });

      throw error;
    }
  }

  // ── Private ──

  /**
   * 개별 슬롯 처리: SlotMapping upsert + course-service GameTimeSlot 업데이트
   */
  private async processSlot(
    partner: { id: number; courseMappings: Array<{ id: number; externalCourseName: string; internalGameId: number }> },
    slot: ExternalSlotData,
  ): Promise<'created' | 'updated' | 'skipped'> {
    // 코스 매핑 찾기
    const courseMapping = partner.courseMappings.find(
      (m) => m.externalCourseName === slot.courseName,
    );

    if (!courseMapping) {
      this.logger.debug(`[processSlot] No mapping for courseName "${slot.courseName}", skipping`);
      return 'skipped';
    }

    // SlotMapping upsert (partner_db)
    const existing = await this.prisma.slotMapping.findUnique({
      where: {
        courseMappingId_externalSlotId: {
          courseMappingId: courseMapping.id,
          externalSlotId: slot.externalSlotId,
        },
      },
    });

    const slotData = {
      externalMaxPlayers: slot.maxPlayers,
      externalBooked: slot.bookedPlayers,
      externalStatus: slot.status,
      externalPrice: slot.price ? new Prisma.Decimal(slot.price) : null,
      lastSyncAt: new Date(),
      syncStatus: 'SYNCED' as const,
      syncError: null,
    };

    let slotMapping;
    let action: 'created' | 'updated';

    if (existing) {
      slotMapping = await this.prisma.slotMapping.update({
        where: { id: existing.id },
        data: slotData,
      });
      action = 'updated';
    } else {
      slotMapping = await this.prisma.slotMapping.create({
        data: {
          courseMappingId: courseMapping.id,
          externalSlotId: slot.externalSlotId,
          date: new Date(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          ...slotData,
        },
      });
      action = 'created';
    }

    // course-service GameTimeSlot 매칭 및 업데이트
    await this.syncGameTimeSlot(slotMapping, courseMapping.internalGameId, slot);

    return action;
  }

  /**
   * course-service GameTimeSlot과 연동
   */
  private async syncGameTimeSlot(
    slotMapping: { id: number; internalSlotId: number | null },
    internalGameId: number,
    slot: ExternalSlotData,
  ): Promise<void> {
    try {
      if (slotMapping.internalSlotId) {
        // 이미 매핑된 슬롯 → bookedPlayers/status 업데이트
        await this.updateGameTimeSlot(slotMapping.internalSlotId, slot);
      } else {
        // 매핑 안된 슬롯 → [gameId, date, startTime]으로 매칭 시도
        const matchResult = await firstValueFrom(
          this.courseClient.send('gameTimeSlots.getByGameAndDate', {
            gameId: internalGameId,
            date: slot.date,
          }).pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => {
              throw new Error(`course-service 조회 실패: ${err.message}`);
            }),
          ),
        );

        if (matchResult?.success && Array.isArray(matchResult.data)) {
          const matched = matchResult.data.find(
            (s: { startTime: string }) => s.startTime === slot.startTime,
          );

          if (matched) {
            // 매칭 성공 → internalSlotId 저장 및 업데이트
            await this.prisma.slotMapping.update({
              where: { id: slotMapping.id },
              data: { internalSlotId: matched.id, syncStatus: 'SYNCED' },
            });

            await this.updateGameTimeSlot(matched.id, slot);
          } else {
            // 매칭 실패 → UNMAPPED
            await this.prisma.slotMapping.update({
              where: { id: slotMapping.id },
              data: { syncStatus: 'UNMAPPED' },
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`[syncGameTimeSlot] Failed to sync with course-service: ${error.message}`);
      await this.prisma.slotMapping.update({
        where: { id: slotMapping.id },
        data: { syncStatus: 'FAILED', syncError: error.message },
      });
    }
  }

  /**
   * course-service GameTimeSlot bookedPlayers/status 업데이트
   */
  private async updateGameTimeSlot(internalSlotId: number, slot: ExternalSlotData): Promise<void> {
    const statusMap: Record<string, string> = {
      AVAILABLE: 'AVAILABLE',
      FULLY_BOOKED: 'FULLY_BOOKED',
      CLOSED: 'CLOSED',
    };

    await firstValueFrom(
      this.courseClient.send('gameTimeSlots.update', {
        id: internalSlotId,
        bookedPlayers: slot.bookedPlayers,
        status: statusMap[slot.status] || 'AVAILABLE',
      }).pipe(
        timeout(NATS_TIMEOUTS.DEFAULT),
        catchError((err) => {
          throw new Error(`GameTimeSlot 업데이트 실패: ${err.message}`);
        }),
      ),
    );
  }

  /**
   * 개별 예약 처리: BookingMapping upsert
   */
  private async processBooking(
    partnerId: number,
    booking: ExternalBookingData,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.prisma.bookingMapping.findUnique({
      where: {
        partnerId_externalBookingId: {
          partnerId,
          externalBookingId: booking.externalBookingId,
        },
      },
    });

    // 코스 매핑 조회 (선택적)
    const courseMapping = booking.courseName
      ? await this.prisma.courseMapping.findFirst({
          where: {
            partnerId,
            externalCourseName: booking.courseName,
            isActive: true,
          },
        })
      : null;

    const bookingData = {
      date: new Date(booking.date),
      startTime: booking.startTime,
      playerCount: booking.playerCount,
      playerName: booking.playerName,
      status: booking.status,
      lastSyncAt: new Date(),
    };

    if (existing) {
      // 데이터 변경 감지 → 충돌 처리
      const hasConflict =
        existing.status !== booking.status ||
        existing.playerCount !== booking.playerCount;

      if (hasConflict && existing.syncStatus === 'SYNCED') {
        await this.prisma.bookingMapping.update({
          where: { id: existing.id },
          data: {
            ...bookingData,
            syncStatus: 'CONFLICT',
            conflictData: {
              internal: {
                status: existing.status,
                playerCount: existing.playerCount,
              },
              external: {
                status: booking.status,
                playerCount: booking.playerCount,
              },
              detectedAt: new Date().toISOString(),
            },
          },
        });
        return 'updated';
      }

      await this.prisma.bookingMapping.update({
        where: { id: existing.id },
        data: { ...bookingData, syncStatus: 'SYNCED' },
      });
      return 'updated';
    }

    // 신규 생성
    await this.prisma.bookingMapping.create({
      data: {
        partnerId,
        courseMappingId: courseMapping?.id ?? null,
        externalBookingId: booking.externalBookingId,
        syncDirection: 'INBOUND',
        syncStatus: 'SYNCED',
        ...bookingData,
      },
    });

    return 'created';
  }

  // ── 조회 API ──

  /**
   * SyncLog 조회 (clubId 기반)
   */
  async getSyncLogs(params: { clubId?: number; partnerId?: number; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    let partnerId = params.partnerId ? Number(params.partnerId) : undefined;

    // clubId로 조회 시 partnerId 변환
    if (params.clubId && !partnerId) {
      const config = await this.prisma.partnerConfig.findUnique({
        where: { clubId: Number(params.clubId) },
      });
      if (!config) return { data: [], total: 0, page, limit };
      partnerId = config.id;
    }

    const where = partnerId ? { partnerId } : {};

    const [items, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  /**
   * SlotMapping 목록 조회 (partnerId 기반)
   */
  async getSlotMappings(params: { partnerId?: number; date?: string; syncStatus?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.partnerId) {
      const courseMappings = await this.prisma.courseMapping.findMany({
        where: { partnerId: Number(params.partnerId) },
        select: { id: true },
      });
      where.courseMappingId = { in: courseMappings.map((cm) => cm.id) };
    }

    if (params.date) {
      where.date = new Date(params.date);
    }

    if (params.syncStatus) {
      where.syncStatus = params.syncStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.slotMapping.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          courseMapping: {
            select: { externalCourseName: true, internalGameId: true },
          },
        },
      }),
      this.prisma.slotMapping.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  /**
   * BookingMapping 목록 조회 (clubId 기반)
   */
  async getBookingMappings(params: { clubId?: number; partnerId?: number; syncStatus?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    let partnerId = params.partnerId ? Number(params.partnerId) : undefined;

    if (params.clubId && !partnerId) {
      const config = await this.prisma.partnerConfig.findUnique({
        where: { clubId: Number(params.clubId) },
      });
      if (!config) return { data: [], total: 0, page, limit };
      partnerId = config.id;
    }

    const where: Record<string, unknown> = {};
    if (partnerId) where.partnerId = partnerId;
    if (params.syncStatus) where.syncStatus = params.syncStatus;

    const [items, total] = await Promise.all([
      this.prisma.bookingMapping.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bookingMapping.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  /**
   * 수동 동기화 (특정 파트너 - clubId 기반)
   */
  async manualSync(clubId: number): Promise<SyncResult[]> {
    const config = await this.prisma.partnerConfig.findUnique({
      where: { clubId },
    });

    if (!config) {
      throw new Error(`clubId ${clubId}에 해당하는 파트너 설정이 없습니다`);
    }

    const results: SyncResult[] = [];

    if (config.slotSyncEnabled) {
      const slotResult = await this.syncSlots(config.id);
      results.push(slotResult);
    }

    if (config.bookingSyncEnabled) {
      const bookingResult = await this.syncBookings(config.id);
      results.push(bookingResult);
    }

    return results;
  }

  /**
   * BookingMapping 충돌 해결
   */
  async resolveConflict(bookingMappingId: number, resolution: { acceptSource: 'internal' | 'external' }) {
    const mapping = await this.prisma.bookingMapping.findUnique({
      where: { id: bookingMappingId },
    });

    if (!mapping) {
      throw new Error('BookingMapping을 찾을 수 없습니다');
    }

    // 충돌 해결: 선택한 소스의 데이터로 확정
    const conflictData = mapping.conflictData as Record<string, unknown> | null;
    const resolved = conflictData?.[resolution.acceptSource] as Record<string, unknown> | undefined;

    const updateData: Record<string, unknown> = {
      syncStatus: 'SYNCED',
      conflictData: null,
      lastSyncAt: new Date(),
    };

    if (resolved) {
      if (resolved.status) updateData.status = resolved.status;
      if (resolved.playerCount) updateData.playerCount = resolved.playerCount;
    }

    return this.prisma.bookingMapping.update({
      where: { id: bookingMappingId },
      data: updateData,
    });
  }

  // ── Private ──

  /**
   * SyncLog 기록
   */
  private async createSyncLog(data: {
    partnerId: number;
    action: SyncAction;
    direction: SyncDirection;
    status: PrismaSyncResult;
    recordCount: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    errorMessage: string | null;
    durationMs: number;
  }): Promise<void> {
    await this.prisma.syncLog.create({
      data: {
        partner: { connect: { id: data.partnerId } },
        action: data.action,
        direction: data.direction,
        status: data.status,
        recordCount: data.recordCount,
        createdCount: data.createdCount,
        updatedCount: data.updatedCount,
        errorCount: data.errorCount,
        errorMessage: data.errorMessage,
        durationMs: data.durationMs,
      },
    });
  }
}

import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { NATS_TIMEOUTS } from '../../common/constants';
import * as crypto from 'crypto';

/**
 * 외부 파트너 웹훅 처리 서비스
 *
 * 지원 이벤트:
 * - booking.created: 외부 예약 생성 → booking-service에 전파
 * - booking.cancelled: 외부 예약 취소 → booking-service에 전파
 * - booking.updated: 외부 예약 변경 → BookingMapping 업데이트
 * - slot.updated: 외부 슬롯 변경 → course-service에 externalBooked 업데이트
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  /**
   * 웹훅 처리 메인 핸들러
   */
  async processWebhook(
    partnerId: number,
    signature: string,
    body: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    // 1. 파트너 설정 조회
    const config = await this.prisma.partnerConfig.findUnique({
      where: { id: partnerId },
    });

    if (!config || !config.isActive) {
      this.logger.warn(`[Webhook] Partner ${partnerId} not found or inactive`);
      return { success: false, message: 'Partner not found or inactive' };
    }

    // 2. 서명 검증
    if (config.webhookSecret) {
      const isValid = this.verifySignature(
        config.webhookSecret,
        signature,
        JSON.stringify(body),
      );

      if (!isValid) {
        this.logger.warn(`[Webhook] Invalid signature for partner ${partnerId}`);
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // 3. 이벤트 라우팅
    const event = String(body.event || body.type || '');
    const data = (body.data || body.payload || body) as Record<string, unknown>;

    switch (event) {
      case 'booking.created':
        return this.handleBookingCreated(partnerId, config.clubId, data);
      case 'booking.cancelled':
        return this.handleBookingCancelled(partnerId, data);
      case 'booking.updated':
        return this.handleBookingUpdated(partnerId, data);
      case 'slot.updated':
        return this.handleSlotUpdated(partnerId, data);
      default:
        this.logger.warn(`[Webhook] Unknown event: ${event}`);
        return { success: true, message: `Event ${event} acknowledged but not processed` };
    }
  }

  /**
   * 외부 예약 생성 → booking-service에 전파
   */
  private async handleBookingCreated(
    partnerId: number,
    clubId: number,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const externalBookingId = String(data.bookingId || data.booking_id || '');
    if (!externalBookingId) {
      return { success: false, message: 'Missing bookingId' };
    }

    // 중복 체크
    const existing = await this.prisma.bookingMapping.findUnique({
      where: {
        partnerId_externalBookingId: { partnerId, externalBookingId },
      },
    });

    if (existing) {
      return { success: true, message: 'Booking already processed' };
    }

    // 슬롯 매핑 조회
    const externalSlotId = String(data.slotId || data.slot_id || '');
    const slotMapping = externalSlotId
      ? await this.prisma.slotMapping.findFirst({
          where: {
            externalSlotId,
            gameMapping: { partnerId },
          },
          include: { gameMapping: true },
        })
      : null;

    if (!slotMapping || !slotMapping.internalSlotId) {
      // 슬롯 매핑 없으면 BookingMapping만 기록
      await this.prisma.bookingMapping.create({
        data: {
          partnerId,
          externalBookingId,
          syncDirection: 'INBOUND',
          syncStatus: 'PENDING',
          date: new Date(String(data.date || new Date().toISOString())),
          startTime: String(data.startTime || data.start_time || ''),
          playerCount: Number(data.playerCount || data.player_count || 1),
          playerName: String(data.playerName || data.player_name || ''),
          status: 'CONFIRMED',
        },
      });

      return { success: true, message: 'Booking recorded (no slot mapping)' };
    }

    // booking-service에 외부 예약 생성 요청
    try {
      const response = await firstValueFrom(
        this.bookingClient.send('booking.createExternal', {
          gameTimeSlotId: slotMapping.internalSlotId,
          gameId: slotMapping.gameMapping.internalGameId,
          playerCount: Number(data.playerCount || data.player_count || 1),
          externalBookingId,
          playerName: String(data.playerName || data.player_name || ''),
          playerPhone: data.playerPhone || data.player_phone,
          bookingDate: String(data.date || ''),
          startTime: String(data.startTime || data.start_time || ''),
          endTime: slotMapping.endTime,
          clubId,
          pricePerPerson: data.price ? Number(data.price) : undefined,
        }).pipe(
          timeout(NATS_TIMEOUTS.DEFAULT),
          catchError((err) => {
            throw new Error(`booking.createExternal 실패: ${err.message}`);
          }),
        ),
      );

      const bookingId = response?.data?.bookingId;

      // BookingMapping 기록
      await this.prisma.bookingMapping.create({
        data: {
          partnerId,
          internalBookingId: bookingId || null,
          externalBookingId,
          gameMappingId: slotMapping.gameMappingId,
          syncDirection: 'INBOUND',
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          date: new Date(String(data.date || new Date().toISOString())),
          startTime: String(data.startTime || data.start_time || ''),
          playerCount: Number(data.playerCount || data.player_count || 1),
          playerName: String(data.playerName || data.player_name || ''),
          status: 'CONFIRMED',
        },
      });

      return { success: true, message: `Booking created (id=${bookingId})` };
    } catch (error) {
      this.logger.error(`[Webhook] handleBookingCreated failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * 외부 예약 취소 → booking-service에 전파
   */
  private async handleBookingCancelled(
    partnerId: number,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const externalBookingId = String(data.bookingId || data.booking_id || '');
    if (!externalBookingId) {
      return { success: false, message: 'Missing bookingId' };
    }

    const mapping = await this.prisma.bookingMapping.findUnique({
      where: {
        partnerId_externalBookingId: { partnerId, externalBookingId },
      },
    });

    if (!mapping) {
      return { success: true, message: 'No mapping found, nothing to cancel' };
    }

    if (mapping.status === 'CANCELLED') {
      return { success: true, message: 'Already cancelled' };
    }

    // booking-service에 취소 요청
    if (mapping.internalBookingId) {
      try {
        await firstValueFrom(
          this.bookingClient.send('booking.cancelExternal', {
            externalBookingId,
            cancelReason: String(data.reason || data.cancelReason || '외부 시스템 취소'),
          }).pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => {
              throw new Error(`booking.cancelExternal 실패: ${err.message}`);
            }),
          ),
        );
      } catch (error) {
        this.logger.error(`[Webhook] handleBookingCancelled failed: ${error.message}`);
      }
    }

    // BookingMapping 상태 업데이트
    await this.prisma.bookingMapping.update({
      where: { id: mapping.id },
      data: {
        status: 'CANCELLED',
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      },
    });

    return { success: true, message: 'Booking cancelled' };
  }

  /**
   * 외부 예약 변경 → BookingMapping 업데이트 + 충돌 감지
   */
  private async handleBookingUpdated(
    partnerId: number,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const externalBookingId = String(data.bookingId || data.booking_id || '');

    const mapping = await this.prisma.bookingMapping.findUnique({
      where: {
        partnerId_externalBookingId: { partnerId, externalBookingId },
      },
    });

    if (!mapping) {
      return { success: true, message: 'No mapping found' };
    }

    const newStatus = String(data.status || mapping.status);
    const newPlayerCount = Number(data.playerCount || data.player_count || mapping.playerCount);

    const hasConflict =
      mapping.syncStatus === 'SYNCED' &&
      (mapping.status !== newStatus || mapping.playerCount !== newPlayerCount);

    await this.prisma.bookingMapping.update({
      where: { id: mapping.id },
      data: {
        status: newStatus,
        playerCount: newPlayerCount,
        syncStatus: hasConflict ? 'CONFLICT' : 'SYNCED',
        conflictData: hasConflict
          ? {
              internal: { status: mapping.status, playerCount: mapping.playerCount },
              external: { status: newStatus, playerCount: newPlayerCount },
              detectedAt: new Date().toISOString(),
            }
          : undefined,
        lastSyncAt: new Date(),
      },
    });

    return {
      success: true,
      message: hasConflict ? 'Booking updated with conflict' : 'Booking updated',
    };
  }

  /**
   * 외부 슬롯 변경 → course-service externalBooked 업데이트
   */
  private async handleSlotUpdated(
    partnerId: number,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const externalSlotId = String(data.slotId || data.slot_id || '');

    const slotMapping = await this.prisma.slotMapping.findFirst({
      where: {
        externalSlotId,
        gameMapping: { partnerId },
      },
    });

    if (!slotMapping || !slotMapping.internalSlotId) {
      return { success: true, message: 'No slot mapping found' };
    }

    const bookedPlayers = Number(data.bookedPlayers || data.booked_players || 0);

    // SlotMapping 업데이트
    await this.prisma.slotMapping.update({
      where: { id: slotMapping.id },
      data: {
        externalBooked: bookedPlayers,
        externalStatus: String(data.status || 'AVAILABLE'),
        lastSyncAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });

    // course-service에 externalBooked 업데이트
    try {
      await firstValueFrom(
        this.courseClient.send('slot.updateExternalBooked', {
          timeSlotId: slotMapping.internalSlotId,
          externalBooked: bookedPlayers,
        }).pipe(
          timeout(NATS_TIMEOUTS.DEFAULT),
          catchError((err) => {
            throw new Error(`slot.updateExternalBooked 실패: ${err.message}`);
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`[Webhook] handleSlotUpdated failed: ${error.message}`);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Slot updated' };
  }

  /**
   * HMAC-SHA256 서명 검증
   */
  private verifySignature(
    encryptedSecret: string,
    signature: string,
    payload: string,
  ): boolean {
    if (!signature) return false;

    try {
      const secret = this.cryptoService.decrypt(encryptedSecret);
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch (error) {
      this.logger.error(`[Webhook] Signature verification failed: ${error.message}`);
      return false;
    }
  }
}

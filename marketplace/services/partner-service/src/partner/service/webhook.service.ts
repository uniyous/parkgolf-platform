import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { eq, and, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { partnerConfigs, bookingMappings, slotMappings, gameMappings } from '../../db/schema';
import { CryptoService } from './crypto.service';
import { NATS_TIMEOUTS } from '../../common/constants';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cryptoService: CryptoService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('CLUB_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async processWebhook(partnerId: number, signature: string, body: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const [config] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.id, partnerId)).limit(1);
    if (!config || !config.isActive) {
      this.logger.warn(`[Webhook] Partner ${partnerId} not found or inactive`);
      return { success: false, message: 'Partner not found or inactive' };
    }

    if (config.webhookSecret) {
      const isValid = this.verifySignature(config.webhookSecret, signature, JSON.stringify(body));
      if (!isValid) {
        this.logger.warn(`[Webhook] Invalid signature for partner ${partnerId}`);
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

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

  /** partnerId에 속한 슬롯 매핑을 externalSlotId로 조회 (gameMapping.partnerId 필터) */
  private slotByPartner(partnerId: number, externalSlotId: string) {
    return this.db.query.slotMappings.findFirst({
      where: and(
        eq(slotMappings.externalSlotId, externalSlotId),
        inArray(slotMappings.gameMappingId, this.db.select({ id: gameMappings.id }).from(gameMappings).where(eq(gameMappings.partnerId, partnerId))),
      ),
      with: { gameMapping: true },
    });
  }

  private async handleBookingCreated(partnerId: number, clubId: number, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const externalBookingId = String(data.bookingId || data.booking_id || '');
    if (!externalBookingId) return { success: false, message: 'Missing bookingId' };

    const [existing] = await this.db.select().from(bookingMappings).where(and(eq(bookingMappings.partnerId, partnerId), eq(bookingMappings.externalBookingId, externalBookingId))).limit(1);
    if (existing) return { success: true, message: 'Booking already processed' };

    const externalSlotId = String(data.slotId || data.slot_id || '');
    const slotMapping = externalSlotId ? await this.slotByPartner(partnerId, externalSlotId) : null;

    if (!slotMapping || !slotMapping.internalSlotId) {
      await this.db.insert(bookingMappings).values({
        partnerId, externalBookingId, syncDirection: 'INBOUND', syncStatus: 'PENDING',
        date: new Date(String(data.date || new Date().toISOString())), startTime: String(data.startTime || data.start_time || ''),
        playerCount: Number(data.playerCount || data.player_count || 1), playerName: String(data.playerName || data.player_name || ''), status: 'CONFIRMED',
      });
      return { success: true, message: 'Booking recorded (no slot mapping)' };
    }

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
          catchError((err) => { throw new Error(`booking.createExternal 실패: ${err.message}`); }),
        ),
      );

      const bookingId = response?.data?.bookingId;
      await this.db.insert(bookingMappings).values({
        partnerId, internalBookingId: bookingId || null, externalBookingId, gameMappingId: slotMapping.gameMappingId,
        syncDirection: 'INBOUND', syncStatus: 'SYNCED', lastSyncAt: new Date(),
        date: new Date(String(data.date || new Date().toISOString())), startTime: String(data.startTime || data.start_time || ''),
        playerCount: Number(data.playerCount || data.player_count || 1), playerName: String(data.playerName || data.player_name || ''), status: 'CONFIRMED',
      });
      return { success: true, message: `Booking created (id=${bookingId})` };
    } catch (error) {
      this.logger.error(`[Webhook] handleBookingCreated failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private async handleBookingCancelled(partnerId: number, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const externalBookingId = String(data.bookingId || data.booking_id || '');
    if (!externalBookingId) return { success: false, message: 'Missing bookingId' };

    const [mapping] = await this.db.select().from(bookingMappings).where(and(eq(bookingMappings.partnerId, partnerId), eq(bookingMappings.externalBookingId, externalBookingId))).limit(1);
    if (!mapping) return { success: true, message: 'No mapping found, nothing to cancel' };
    if (mapping.status === 'CANCELLED') return { success: true, message: 'Already cancelled' };

    if (mapping.internalBookingId) {
      try {
        await firstValueFrom(
          this.bookingClient.send('booking.cancelExternal', { externalBookingId, cancelReason: String(data.reason || data.cancelReason || '외부 시스템 취소') }).pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => { throw new Error(`booking.cancelExternal 실패: ${err.message}`); }),
          ),
        );
      } catch (error) {
        this.logger.error(`[Webhook] handleBookingCancelled failed: ${error.message}`);
      }
    }

    await this.db.update(bookingMappings).set({ status: 'CANCELLED', syncStatus: 'SYNCED', lastSyncAt: new Date() }).where(eq(bookingMappings.id, mapping.id));
    return { success: true, message: 'Booking cancelled' };
  }

  private async handleBookingUpdated(partnerId: number, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const externalBookingId = String(data.bookingId || data.booking_id || '');
    const [mapping] = await this.db.select().from(bookingMappings).where(and(eq(bookingMappings.partnerId, partnerId), eq(bookingMappings.externalBookingId, externalBookingId))).limit(1);
    if (!mapping) return { success: true, message: 'No mapping found' };

    const newStatus = String(data.status || mapping.status);
    const newPlayerCount = Number(data.playerCount || data.player_count || mapping.playerCount);
    const hasConflict = mapping.syncStatus === 'SYNCED' && (mapping.status !== newStatus || mapping.playerCount !== newPlayerCount);

    await this.db.update(bookingMappings).set({
      status: newStatus,
      playerCount: newPlayerCount,
      syncStatus: hasConflict ? 'CONFLICT' : 'SYNCED',
      conflictData: hasConflict
        ? { internal: { status: mapping.status, playerCount: mapping.playerCount }, external: { status: newStatus, playerCount: newPlayerCount }, detectedAt: new Date().toISOString() }
        : undefined,
      lastSyncAt: new Date(),
    }).where(eq(bookingMappings.id, mapping.id));

    return { success: true, message: hasConflict ? 'Booking updated with conflict' : 'Booking updated' };
  }

  private async handleSlotUpdated(partnerId: number, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const externalSlotId = String(data.slotId || data.slot_id || '');
    const slotMapping = await this.slotByPartner(partnerId, externalSlotId);
    if (!slotMapping || !slotMapping.internalSlotId) return { success: true, message: 'No slot mapping found' };

    const bookedPlayers = Number(data.bookedPlayers || data.booked_players || 0);
    await this.db.update(slotMappings).set({ externalBooked: bookedPlayers, externalStatus: String(data.status || 'AVAILABLE'), lastSyncAt: new Date(), syncStatus: 'SYNCED' }).where(eq(slotMappings.id, slotMapping.id));

    try {
      await firstValueFrom(
        this.courseClient.send('slot.updateExternalBooked', { timeSlotId: slotMapping.internalSlotId, externalBooked: bookedPlayers }).pipe(
          timeout(NATS_TIMEOUTS.DEFAULT),
          catchError((err) => { throw new Error(`slot.updateExternalBooked 실패: ${err.message}`); }),
        ),
      );
    } catch (error) {
      this.logger.error(`[Webhook] handleSlotUpdated failed: ${error.message}`);
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Slot updated' };
  }

  private verifySignature(encryptedSecret: string, signature: string, payload: string): boolean {
    if (!signature) return false;
    try {
      const secret = this.cryptoService.decrypt(encryptedSecret);
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch (error) {
      this.logger.error(`[Webhook] Signature verification failed: ${error.message}`);
      return false;
    }
  }
}

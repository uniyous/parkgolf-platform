import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService } from '../common/nats';
import { NATS_TIMEOUTS } from '../common/constants/nats.constants';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ── PartnerConfig ──

  async createConfig(data: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.config.create', { ...data, token }, NATS_TIMEOUTS.DEFAULT);
  }

  async getConfig(id: number, token: string) {
    return this.natsClient.send('partner.config.get', { id, token }, NATS_TIMEOUTS.QUICK);
  }

  async getConfigByClub(clubId: number, token: string) {
    return this.natsClient.send('partner.config.getByClub', { clubId, token }, NATS_TIMEOUTS.QUICK);
  }

  async listConfigs(params: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.config.list', { ...params, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async updateConfig(data: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.config.update', { ...data, token }, NATS_TIMEOUTS.DEFAULT);
  }

  async deleteConfig(id: number, token: string) {
    return this.natsClient.send('partner.config.delete', { id, token }, NATS_TIMEOUTS.DEFAULT);
  }

  async testConnection(id: number, token: string) {
    return this.natsClient.send('partner.config.test', { id, token }, NATS_TIMEOUTS.BULK_OPERATION);
  }

  // ── GameMapping ──

  async createGameMapping(data: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.gameMapping.create', { ...data, token }, NATS_TIMEOUTS.DEFAULT);
  }

  async listGameMappings(partnerId: number, token: string) {
    return this.natsClient.send('partner.gameMapping.list', { partnerId, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async updateGameMapping(data: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.gameMapping.update', { ...data, token }, NATS_TIMEOUTS.DEFAULT);
  }

  async deleteGameMapping(id: number, token: string) {
    return this.natsClient.send('partner.gameMapping.delete', { id, token }, NATS_TIMEOUTS.DEFAULT);
  }

  // ── Sync ──

  async manualSync(partnerId: number, token: string) {
    return this.natsClient.send('partner.sync.manual', { partnerId, token }, NATS_TIMEOUTS.BULK_OPERATION);
  }

  async getSyncLogs(params: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.sync.logs', { ...params, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // ── SlotMapping ──

  async listSlotMappings(params: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.slotMapping.list', { ...params, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // ── BookingMapping ──

  async listBookingMappings(params: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.bookingMapping.list', { ...params, token }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async resolveConflict(bookingMappingId: number, resolution: Record<string, unknown>, token: string) {
    return this.natsClient.send('partner.bookingMapping.resolve', { bookingMappingId, ...resolution, token }, NATS_TIMEOUTS.DEFAULT);
  }
}

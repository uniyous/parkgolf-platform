import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService } from '../common/nats';
import { NATS_TIMEOUTS } from '../common/constants/nats.constants';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ── PartnerConfig ──

  async createConfig(data: Record<string, unknown>) {
    return this.natsClient.send('partner.config.create', data, NATS_TIMEOUTS.DEFAULT);
  }

  async getConfig(id: number) {
    return this.natsClient.send('partner.config.get', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getConfigByClub(clubId: number) {
    return this.natsClient.send('partner.config.getByClub', { clubId }, NATS_TIMEOUTS.QUICK);
  }

  async listConfigs(params: Record<string, unknown>) {
    return this.natsClient.send('partner.config.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async updateConfig(data: Record<string, unknown>) {
    return this.natsClient.send('partner.config.update', data, NATS_TIMEOUTS.DEFAULT);
  }

  async deleteConfig(id: number) {
    return this.natsClient.send('partner.config.delete', { id }, NATS_TIMEOUTS.DEFAULT);
  }

  async testConnection(id: number) {
    return this.natsClient.send('partner.config.test', { id }, NATS_TIMEOUTS.BULK_OPERATION);
  }

  // ── GameMapping ──

  async createGameMapping(data: Record<string, unknown>) {
    return this.natsClient.send('partner.gameMapping.create', data, NATS_TIMEOUTS.DEFAULT);
  }

  async listGameMappings(partnerId: number) {
    return this.natsClient.send('partner.gameMapping.list', { partnerId }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async updateGameMapping(data: Record<string, unknown>) {
    return this.natsClient.send('partner.gameMapping.update', data, NATS_TIMEOUTS.DEFAULT);
  }

  async deleteGameMapping(id: number) {
    return this.natsClient.send('partner.gameMapping.delete', { id }, NATS_TIMEOUTS.DEFAULT);
  }

  // ── Sync ──

  async manualSync(clubId: number) {
    return this.natsClient.send('partner.sync.manual', { clubId }, NATS_TIMEOUTS.BULK_OPERATION);
  }

  async manualSyncByPartnerId(partnerId: number) {
    return this.natsClient.send('partner.sync.manual', { partnerId }, NATS_TIMEOUTS.BULK_OPERATION);
  }

  async getSyncLogs(params: Record<string, unknown>) {
    return this.natsClient.send('partner.sync.logs', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  // ── SlotMapping ──

  async listSlotMappings(params: Record<string, unknown>) {
    return this.natsClient.send('partner.slotMapping.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  // ── BookingMapping ──

  async listBookingMappings(params: Record<string, unknown>) {
    return this.natsClient.send('partner.bookingMapping.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  async resolveConflict(bookingMappingId: number, resolution: Record<string, unknown>) {
    return this.natsClient.send('partner.bookingMapping.resolve', { bookingMappingId, ...resolution }, NATS_TIMEOUTS.DEFAULT);
  }
}

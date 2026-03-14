import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SyncService } from '../service/sync.service';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class SyncNatsController {
  private readonly logger = new Logger(SyncNatsController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * 전체 활성 파트너 동기화 (job-service cron에서 호출)
   */
  @MessagePattern('partner.sync.execute')
  async syncAll() {
    this.logger.log('[partner.sync.execute] Full sync triggered');
    const result = await this.syncService.syncAll();
    return NatsResponse.success(result);
  }

  /**
   * 특정 파트너 슬롯 동기화 (수동 트리거)
   */
  @MessagePattern('partner.sync.slots')
  async syncSlots(@Payload() data: { partnerId: number }) {
    this.logger.log(`[partner.sync.slots] Partner ${data.partnerId}`);
    const result = await this.syncService.syncSlots(data.partnerId);
    return NatsResponse.success(result);
  }

  /**
   * 특정 파트너 예약 동기화 (수동 트리거)
   */
  @MessagePattern('partner.sync.bookings')
  async syncBookings(@Payload() data: { partnerId: number }) {
    this.logger.log(`[partner.sync.bookings] Partner ${data.partnerId}`);
    const result = await this.syncService.syncBookings(data.partnerId);
    return NatsResponse.success(result);
  }
}

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

  /**
   * SyncLog 조회
   */
  @MessagePattern('partner.sync.logs')
  async getSyncLogs(@Payload() data: { clubId?: number; partnerId?: number; page?: number; limit?: number }) {
    const result = await this.syncService.getSyncLogs(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }

  /**
   * 수동 동기화 (BFF에서 clubId를 partnerId로 전달)
   */
  @MessagePattern('partner.sync.manual')
  async manualSync(@Payload() data: { partnerId: number }) {
    this.logger.log(`[partner.sync.manual] clubId=${data.partnerId}`);
    const results = await this.syncService.manualSync(data.partnerId);
    return NatsResponse.success(results);
  }

  /**
   * BookingMapping 목록 조회
   */
  @MessagePattern('partner.bookingMapping.list')
  async listBookingMappings(@Payload() data: { clubId?: number; partnerId?: number; syncStatus?: string; page?: number; limit?: number }) {
    const result = await this.syncService.getBookingMappings(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }

  /**
   * BookingMapping 충돌 해결
   */
  @MessagePattern('partner.bookingMapping.resolve')
  async resolveConflict(@Payload() data: { bookingMappingId: number; acceptSource: 'internal' | 'external' }) {
    const result = await this.syncService.resolveConflict(data.bookingMappingId, { acceptSource: data.acceptSource });
    return NatsResponse.success(result);
  }
}

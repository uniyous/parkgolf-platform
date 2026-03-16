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
   * SlotMapping 목록 조회
   */
  @MessagePattern('partner.slotMapping.list')
  async listSlotMappings(@Payload() data: { partnerId?: number; date?: string; syncStatus?: string; page?: number; limit?: number }) {
    const result = await this.syncService.getSlotMappings(data);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
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

  // =====================================================
  // Saga Step 핸들러 (외부 연동)
  // =====================================================

  /**
   * 외부 슬롯 가용성 검증 (CREATE_BOOKING Saga에서 호출)
   */
  @MessagePattern('partner.slot.verifyAvailability')
  async verifySlotAvailability(@Payload() data: {
    clubId: number;
    gameTimeSlotId: number;
    playerCount: number;
    bookingDate: string;
    startTime: string;
  }) {
    this.logger.log(`[partner.slot.verifyAvailability] clubId=${data.clubId}, slot=${data.gameTimeSlotId}`);
    const result = await this.syncService.verifySlotAvailability(data);
    return NatsResponse.success(result);
  }

  /**
   * 외부 시스템에 예약 생성 통보 (Outbound)
   */
  @MessagePattern('partner.booking.notifyCreated')
  async notifyBookingCreated(@Payload() data: {
    clubId: number;
    bookingId: number;
    bookingNumber: string;
    externalSlotId?: string;
    playerCount: number;
    playerName?: string;
    bookingDate: string;
    startTime: string;
  }) {
    this.logger.log(`[partner.booking.notifyCreated] clubId=${data.clubId}, bookingId=${data.bookingId}`);
    const result = await this.syncService.notifyBookingCreated(data);
    return NatsResponse.success(result);
  }

  /**
   * 외부 시스템에 예약 취소 통보 (Outbound)
   */
  @MessagePattern('partner.booking.notifyCancelled')
  async notifyBookingCancelled(@Payload() data: {
    clubId: number;
    bookingId: number;
    bookingNumber: string;
    cancelReason?: string;
  }) {
    this.logger.log(`[partner.booking.notifyCancelled] clubId=${data.clubId}, bookingId=${data.bookingId}`);
    const result = await this.syncService.notifyBookingCancelled(data);
    return NatsResponse.success(result);
  }
}

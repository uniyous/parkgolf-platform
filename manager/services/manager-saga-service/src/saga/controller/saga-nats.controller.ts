import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SagaEngine } from '@uniyous/saga-engine';

/**
 * manager-saga-service NATS 컨트롤러 (UNI-127 ② chunk B).
 *
 * 진입 subject는 마켓(`saga.booking.*`)과 분리: `saga.deskbooking.*`·`saga.kiosk.*`.
 * 관리 subject도 분리: `manager.saga.*` (마켓 `saga.*`와 NATS 라운드로빈 충돌 방지).
 */
@Controller()
export class SagaNatsController {
  private readonly logger = new Logger(SagaNatsController.name);

  constructor(private readonly sagaEngine: SagaEngine) {}

  // ===== Saga 트리거 (manager-bff → manager-saga-service) =====

  @MessagePattern('saga.deskbooking.create')
  async handleCreateDeskBooking(@Payload() data: Record<string, unknown>) {
    this.logger.log('[Saga] saga.deskbooking.create received');
    const { staffId, channel, ...deskBookingFields } = data;
    return this.sagaEngine.startSaga(
      'CREATE_DESK_BOOKING',
      {
        deskBookingData: deskBookingFields,
        channel: channel ?? 'DESK',
        staffId,
        idempotencyKey: deskBookingFields.idempotencyKey,
      },
      'STAFF',
      staffId as number,
    );
  }

  @MessagePattern('saga.kiosk.checkin')
  async handleKioskCheckin(@Payload() data: Record<string, unknown>) {
    this.logger.log('[Saga] saga.kiosk.checkin received');
    return this.sagaEngine.startSaga(
      'KIOSK_CHECKIN',
      {
        kioskId: data.kioskId,
        clubId: data.clubId,
        gameTimeSlotId: data.gameTimeSlotId,
        playerCount: data.playerCount,
        paymentMethod: data.paymentMethod,
        idempotencyKey: data.idempotencyKey,
      },
      'KIOSK',
    );
  }

  // ===== Saga 관리 (manager-bff → manager-saga-service) — manager.saga.* 네임스페이스 =====

  @MessagePattern('manager.saga.list')
  async handleListSagas(@Payload() data: { sagaType?: string; status?: string; page?: number; limit?: number }) {
    return this.sagaEngine.listSagas(data);
  }

  @MessagePattern('manager.saga.get')
  async handleGetSaga(@Payload() data: { sagaExecutionId: number }) {
    return this.sagaEngine.getSaga(data.sagaExecutionId);
  }

  @MessagePattern('manager.saga.retry')
  async handleRetrySaga(@Payload() data: { sagaExecutionId: number }) {
    this.logger.log(`[Saga] manager.saga.retry received: id=${data.sagaExecutionId}`);
    return this.sagaEngine.retrySaga(data.sagaExecutionId);
  }

  @MessagePattern('manager.saga.resolve')
  async handleResolveSaga(@Payload() data: { sagaExecutionId: number; adminNote?: string }) {
    this.logger.log(`[Saga] manager.saga.resolve received: id=${data.sagaExecutionId}`);
    return this.sagaEngine.resolveSaga(data.sagaExecutionId, data.adminNote);
  }

  @MessagePattern('manager.saga.stats')
  async handleGetStats(@Payload() data: { startDate?: string; endDate?: string }) {
    const dateRange =
      data.startDate && data.endDate ? { startDate: data.startDate, endDate: data.endDate } : undefined;
    return this.sagaEngine.getStats(dateRange);
  }
}

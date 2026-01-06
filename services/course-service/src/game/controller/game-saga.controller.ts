import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';
import { GameTimeSlotService } from '../service/game-time-slot.service';

/**
 * Saga NATS 컨트롤러
 *
 * booking-service로부터 수신하는 Saga 요청 처리:
 * - slot.reserve: 슬롯 예약 요청 → slot.reserved 또는 slot.reserve.failed 발행
 * - slot.release: 슬롯 해제 요청 → slot.released 발행
 */
@Controller()
export class GameSagaController {
  private readonly logger = new Logger(GameSagaController.name);

  constructor(
    private readonly gameTimeSlotService: GameTimeSlotService,
    @Inject('BOOKING_SERVICE') private readonly bookingServiceClient: ClientProxy,
  ) {}

  /**
   * 슬롯 예약 요청 핸들러 (Request-Reply 패턴)
   *
   * booking-service의 OutboxProcessor가 발행한 slot.reserve 메시지 처리
   * 성공/실패에 따라 slot.reserved 또는 slot.reserve.failed 이벤트 발행
   */
  @MessagePattern('slot.reserve')
  async handleSlotReserve(@Payload() data: {
    bookingId: number;
    bookingNumber: string;
    gameTimeSlotId: number;
    playerCount: number;
    requestedAt: string;
  }) {
    const startTime = Date.now();
    this.logger.log(`[Saga] ========== SLOT_RESERVE REQUEST RECEIVED ==========`);
    this.logger.log(`[Saga] bookingId=${data.bookingId}, bookingNumber=${data.bookingNumber}, gameTimeSlotId=${data.gameTimeSlotId}, playerCount=${data.playerCount}, requestedAt=${data.requestedAt}`);

    try {
      const result = await this.gameTimeSlotService.reserveSlotForSaga(
        data.gameTimeSlotId,
        data.playerCount,
        data.bookingId
      );

      const elapsed = Date.now() - startTime;
      if (result.success) {
        // 성공: slot.reserved 이벤트 발행
        const reservedEvent = {
          bookingId: data.bookingId,
          gameTimeSlotId: data.gameTimeSlotId,
          playerCount: data.playerCount,
          reservedAt: new Date().toISOString(),
        };

        this.bookingServiceClient.emit('slot.reserved', reservedEvent);
        this.logger.log(`[Saga] SLOT_RESERVE SUCCESS in ${elapsed}ms - bookingId=${data.bookingId}, emitting slot.reserved`);
        this.logger.log(`[Saga] ========== SLOT_RESERVE COMPLETED (SUCCESS) ==========`);

        return { success: true, message: 'Slot reserved successfully' };
      } else {
        // 실패: slot.reserve.failed 이벤트 발행
        const failedEvent = {
          bookingId: data.bookingId,
          gameTimeSlotId: data.gameTimeSlotId,
          reason: result.error || 'Unknown error',
          failedAt: new Date().toISOString(),
        };

        this.bookingServiceClient.emit('slot.reserve.failed', failedEvent);
        this.logger.warn(`[Saga] SLOT_RESERVE FAILED in ${elapsed}ms - bookingId=${data.bookingId}, reason="${result.error}", emitting slot.reserve.failed`);
        this.logger.log(`[Saga] ========== SLOT_RESERVE COMPLETED (FAILED) ==========`);

        return { success: false, error: result.error };
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      // 예외 발생: slot.reserve.failed 이벤트 발행
      const failedEvent = {
        bookingId: data.bookingId,
        gameTimeSlotId: data.gameTimeSlotId,
        reason: error.message || 'Internal error',
        failedAt: new Date().toISOString(),
      };

      this.bookingServiceClient.emit('slot.reserve.failed', failedEvent);
      this.logger.error(`[Saga] SLOT_RESERVE EXCEPTION in ${elapsed}ms - bookingId=${data.bookingId}, error="${error.message}", emitting slot.reserve.failed`);
      this.logger.log(`[Saga] ========== SLOT_RESERVE COMPLETED (EXCEPTION) ==========`);

      return { success: false, error: error.message };
    }
  }

  /**
   * 슬롯 해제 요청 핸들러 (예약 취소 시)
   *
   * booking-service에서 예약 취소 시 발행되는 slot.release 메시지 처리
   */
  @MessagePattern('slot.release')
  async handleSlotRelease(@Payload() data: {
    bookingId: number;
    gameTimeSlotId: number;
    playerCount: number;
    reason: string;
    requestedAt: string;
  }) {
    this.logger.log(`[Saga] Received slot.release for booking ${data.bookingId} (slot: ${data.gameTimeSlotId})`);

    try {
      const result = await this.gameTimeSlotService.releaseSlotForSaga(
        data.gameTimeSlotId,
        data.playerCount,
        data.bookingId,
        data.reason
      );

      if (result.success) {
        // 성공: slot.released 이벤트 발행
        const releasedEvent = {
          bookingId: data.bookingId,
          gameTimeSlotId: data.gameTimeSlotId,
          playerCount: data.playerCount,
          releasedAt: new Date().toISOString(),
        };

        this.bookingServiceClient.emit('slot.released', releasedEvent);
        this.logger.log(`[Saga] Emitted slot.released for booking ${data.bookingId}`);

        return { success: true, message: 'Slot released successfully' };
      } else {
        this.logger.error(`[Saga] Failed to release slot for booking ${data.bookingId}: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error(`[Saga] Exception during slot.release for booking ${data.bookingId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

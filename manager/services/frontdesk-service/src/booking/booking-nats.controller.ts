import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from './booking.service';

type Channel = 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';

/**
 * frontdesk-service NATS 컨트롤러 (UNI-114 부킹).
 * 진입 subject `frontdesk.*` = manager-saga CREATE_DESK_BOOKING·KIOSK_CHECKIN 계약과 일치.
 */
@Controller()
export class BookingNatsController {
  private readonly logger = new Logger(BookingNatsController.name);

  constructor(private readonly booking: BookingService) {}

  // ===== saga: 데스크 부킹 (CREATE_DESK_BOOKING) =====

  @MessagePattern('frontdesk.deskBooking.create')
  async createDeskBooking(@Payload() data: { deskBookingData?: Record<string, unknown>; channel?: Channel; staffId?: number }) {
    this.logger.log(`[frontdesk.deskBooking.create] channel=${data.channel} staff=${data.staffId}`);
    return this.booking.createDeskBooking(data);
  }

  @MessagePattern('frontdesk.deskBooking.confirm')
  async confirmDeskBooking(@Payload() data: { bookingId: number; receiptId?: string; confirmedAt?: string }) {
    this.logger.log(`[frontdesk.deskBooking.confirm] bookingId=${data.bookingId} receipt=${data.receiptId}`);
    return this.booking.confirm(data.bookingId);
  }

  @MessagePattern('frontdesk.deskBooking.markFailed')
  async markFailedDeskBooking(@Payload() data: { bookingId?: number }) {
    this.logger.log(`[frontdesk.deskBooking.markFailed] bookingId=${data.bookingId}`);
    return this.booking.markFailed(data.bookingId);
  }

  // ===== saga: 키오스크 체크인 (KIOSK_CHECKIN) =====

  @MessagePattern('frontdesk.kiosk.checkin')
  async kioskCheckin(@Payload() data: {
    kioskId?: string;
    clubId: number;
    gameTimeSlotId: number;
    playerCount: number;
    companyId?: number;
    unitPrice?: number;
    totalPrice?: number;
  }) {
    this.logger.log(`[frontdesk.kiosk.checkin] kiosk=${data.kioskId} club=${data.clubId} slot=${data.gameTimeSlotId}`);
    return this.booking.createKioskCheckin(data);
  }

  @MessagePattern('frontdesk.kiosk.confirm')
  async confirmKiosk(@Payload() data: { bookingId: number; receiptId?: string; confirmedAt?: string }) {
    this.logger.log(`[frontdesk.kiosk.confirm] bookingId=${data.bookingId}`);
    return this.booking.confirm(data.bookingId);
  }

  @MessagePattern('frontdesk.kiosk.markFailed')
  async markFailedKiosk(@Payload() data: { bookingId?: number }) {
    this.logger.log(`[frontdesk.kiosk.markFailed] bookingId=${data.bookingId}`);
    return this.booking.markFailed(data.bookingId);
  }

  // ===== 조회 (manager-bff) =====

  @MessagePattern('frontdesk.booking.list')
  async list(@Payload() data: { clubId?: number; status?: string; channel?: Channel; page?: number; limit?: number }) {
    return this.booking.list(data);
  }

  @MessagePattern('frontdesk.booking.get')
  async get(@Payload() data: { id: number }) {
    return this.booking.get(data.id);
  }
}

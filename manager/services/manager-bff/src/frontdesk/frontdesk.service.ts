import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import { AdminContextData } from '../common';
import { CreateDeskBookingDto, CheckinDto, PayDto } from './dto/frontdesk.dto';

/**
 * 데스크 부킹·체크아웃 BFF (UNI-137) — REST → NATS(frontdesk·manager-saga).
 * 직원 행위자(staffId)·테넌시(companyId)는 AdminContext에서.
 */
@Injectable()
export class FrontdeskService {
  private readonly logger = new Logger(FrontdeskService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ===== 부킹 =====

  /** 데스크 부킹 생성 — saga.deskbooking.create → 표준 {success,data,saga} 정규화 */
  async createBooking(dto: CreateDeskBookingDto, ctx: AdminContextData): Promise<ApiResponse<unknown>> {
    const result = await this.natsClient.send<ApiResponse<Record<string, unknown>>>('saga.deskbooking.create', {
      ...dto,
      staffId: ctx.adminId,
      companyId: ctx.companyId ?? undefined,
    });

    const saga = result.saga;
    if (saga && (saga.status === 'FAILED' || saga.status === 'COMPENSATED' || saga.status === 'REQUIRES_MANUAL')) {
      throw new BadRequestException({ code: 'SAGA_FAILED', message: saga.failReason || '데스크 예약 생성에 실패했습니다', saga });
    }
    const bookingId = (result.data?.bookingId as number) ?? (result.data?.id as number);
    if (!bookingId) {
      throw new BadRequestException({ code: 'SAGA_RESPONSE_INVALID', message: 'Saga 응답에 예약 ID 없음', saga });
    }
    const refetch = await this.natsClient.send<ApiResponse<unknown>>(
      'frontdesk.booking.get',
      { id: bookingId },
      NATS_TIMEOUTS.QUICK,
    );
    return { success: true, data: refetch?.data ?? { bookingId }, saga };
  }

  async listBookings(filters: { clubId?: number; status?: string; channel?: string; page?: number; limit?: number }): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('frontdesk.booking.list', filters, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getBooking(id: number): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('frontdesk.booking.get', { id }, NATS_TIMEOUTS.QUICK);
  }

  // ===== 체크아웃 =====

  async checkin(dto: CheckinDto): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('frontdesk.checkout.checkin', dto);
  }

  async pay(dto: PayDto, ctx: AdminContextData): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('frontdesk.checkout.pay', { ...dto, staffId: ctx.adminId });
  }

  async cancelCheckout(checkoutId: number, reason?: string): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('frontdesk.checkout.cancel', { checkoutId, reason });
  }

  async checkoutStatus(bookingId: number): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('frontdesk.checkout.status', { bookingId }, NATS_TIMEOUTS.QUICK);
  }
}

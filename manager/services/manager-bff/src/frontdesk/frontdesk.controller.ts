import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FrontdeskService } from './frontdesk.service';
import { AdminContext, AdminContextData } from '../common';
import { CreateDeskBookingDto, CheckinDto, PayDto, CancelCheckoutDto } from './dto/frontdesk.dto';

@ApiTags('frontdesk')
@ApiBearerAuth()
@Controller('api/admin/frontdesk')
export class FrontdeskController {
  private readonly logger = new Logger(FrontdeskController.name);

  constructor(private readonly frontdesk: FrontdeskService) {}

  // ===== 부킹 =====

  @Post('bookings')
  @ApiOperation({ summary: '데스크 부킹 생성 (saga)' })
  async createBooking(@AdminContext() ctx: AdminContextData | null, @Body() dto: CreateDeskBookingDto) {
    return this.frontdesk.createBooking(dto, ctx);
  }

  @Get('bookings')
  @ApiOperation({ summary: '데스크 부킹 목록' })
  async listBookings(
    @Query('clubId') clubId?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.frontdesk.listBookings({
      clubId: clubId ? Number(clubId) : undefined,
      status,
      channel,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: '데스크 부킹 상세' })
  async getBooking(@Param('id', ParseIntPipe) id: number) {
    return this.frontdesk.getBooking(id);
  }

  // ===== 체크아웃 =====

  @Post('checkout/checkin')
  @ApiOperation({ summary: '입장(체크인) — 수납과 독립' })
  async checkin(@Body() dto: CheckinDto) {
    return this.frontdesk.checkin(dto);
  }

  @Post('checkout/pay')
  @ApiOperation({ summary: '수납 — 선택 플레이어(모두/개별/N명분 1인)' })
  async pay(@AdminContext() ctx: AdminContextData | null, @Body() dto: PayDto) {
    return this.frontdesk.pay(dto, ctx);
  }

  @Post('checkout/:checkoutId/cancel')
  @ApiOperation({ summary: '체크아웃 취소(환불)' })
  async cancel(@Param('checkoutId', ParseIntPipe) checkoutId: number, @Body() dto: CancelCheckoutDto) {
    return this.frontdesk.cancelCheckout(checkoutId, dto.reason);
  }

  @Get('checkout/status')
  @ApiOperation({ summary: '예약 체크아웃 현황(입장·수납)' })
  async status(@Query('bookingId', ParseIntPipe) bookingId: number) {
    return this.frontdesk.checkoutStatus(bookingId);
  }
}

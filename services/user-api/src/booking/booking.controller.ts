import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import {
  CreateBookingDto,
  UpdateBookingDto,
  SearchBookingDto,
  CancelBookingDto,
  CancelParticipantDto,
} from './dto/booking.dto';

@ApiTags('Booking')
@Controller('api/user/bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '새 예약 생성' })
  @ApiResponse({
    status: 201,
    description: '예약이 성공적으로 생성되었습니다.',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  async createBooking(
    @CurrentUser('userId') userId: number,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    this.logger.log(`Creating booking for user ${userId}`);
    return this.bookingService.createBooking(userId, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 예약 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '예약 목록을 성공적으로 조회했습니다.',
  })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  async getMyBookings(@CurrentUser('userId') userId: number) {
    this.logger.log(`Getting bookings for user ${userId}`);
    return this.bookingService.getBookingsByUserId(userId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 검색' })
  @ApiResponse({
    status: 200,
    description: '검색 결과를 성공적으로 조회했습니다.',
  })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  async searchBookings(
    @CurrentUser('userId') userId: number,
    @Query() searchDto: SearchBookingDto,
  ) {
    this.logger.log(
      `Searching bookings for user ${userId} with filters: ${JSON.stringify(searchDto)}`,
    );
    return this.bookingService.searchBookings({ ...searchDto, userId });
  }

  @Get('number/:bookingNumber')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약번호로 예약 조회' })
  @ApiResponse({ status: 200, description: '예약을 성공적으로 조회했습니다.' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
  async getBookingByNumber(@Param('bookingNumber') bookingNumber: string) {
    this.logger.log(`Getting booking by number: ${bookingNumber}`);
    return this.bookingService.getBookingByNumber(bookingNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID로 예약 조회' })
  @ApiResponse({ status: 200, description: '예약을 성공적으로 조회했습니다.' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
  async getBookingById(@Param('id') id: number) {
    this.logger.log(`Getting booking by ID: ${id}`);
    return this.bookingService.getBookingById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 정보 수정' })
  @ApiResponse({
    status: 200,
    description: '예약이 성공적으로 수정되었습니다.',
  })
  @ApiResponse({ status: 400, description: '수정할 수 없는 예약입니다.' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
  async updateBooking(
    @Param('id') id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    this.logger.log(`Updating booking ${id}`);
    return this.bookingService.updateBooking(id, updateBookingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 취소 (단일 결제 — booker 전체 취소)' })
  @ApiResponse({
    status: 200,
    description: '예약이 성공적으로 취소되었습니다.',
  })
  @ApiResponse({ status: 400, description: '취소할 수 없는 예약입니다.' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
  async cancelBooking(
    @CurrentUser('userId') userId: number,
    @Param('id') id: number,
    @Body() cancelDto: CancelBookingDto,
  ) {
    this.logger.log(`Cancelling booking ${id} for user ${userId}`);
    return this.bookingService.cancelBooking(id, userId, cancelDto.reason);
  }

  // AGENT_PAY.md §11.4 — 더치페이 본인 자리 취소
  // JWT userId가 곧 취소 대상 participant.userId — booking-service에서 검증·환불·슬롯 release.
  @Delete(':id/participant')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '더치페이 본인 자리만 취소 (참여자/booker 동일)' })
  @ApiResponse({ status: 200, description: '본인 자리가 취소되었습니다.' })
  @ApiResponse({ status: 400, description: '이미 취소되었거나 환불 처리 실패' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '참여자를 찾을 수 없습니다.' })
  async cancelParticipant(
    @CurrentUser('userId') userId: number,
    @Param('id') id: number,
    @Body() dto: CancelParticipantDto,
  ) {
    this.logger.log(`Cancelling participant: booking=${id} user=${userId}`);
    return this.bookingService.cancelParticipant(id, userId, dto?.reason);
  }

  @Get('games/:gameId/time-slots')
  @ApiOperation({ summary: '특정 게임의 타임슬롯 가용성 조회' })
  @ApiResponse({
    status: 200,
    description: '타임슬롯 가용성을 성공적으로 조회했습니다.',
  })
  async getTimeSlotAvailability(
    @Param('gameId') gameId: number,
    @Query('date') date: string,
  ) {
    this.logger.log(
      `Getting time slot availability for game ${gameId} on ${date}`,
    );

    const effectiveDate = date || new Date().toISOString().split('T')[0];
    return this.bookingService.getTimeSlotAvailability(gameId, effectiveDate);
  }
}

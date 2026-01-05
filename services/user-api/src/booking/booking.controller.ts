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
  Request,
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
import {
  CreateBookingDto,
  UpdateBookingDto,
  SearchBookingDto,
  CancelBookingDto,
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
    @Request() req: any,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    this.logger.log(`Creating booking for user ${req.user.userId}`);
    return this.bookingService.createBooking(req.user.userId, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 예약 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '예약 목록을 성공적으로 조회했습니다.',
  })
  async getMyBookings(@Request() req: any) {
    this.logger.log(`Getting bookings for user ${req.user.userId}`);
    return this.bookingService.getBookingsByUserId(req.user.userId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 검색' })
  @ApiResponse({
    status: 200,
    description: '검색 결과를 성공적으로 조회했습니다.',
  })
  async searchBookings(@Query() searchDto: SearchBookingDto) {
    this.logger.log(
      `Searching bookings with filters: ${JSON.stringify(searchDto)}`,
    );
    return this.bookingService.searchBookings(searchDto);
  }

  @Get('number/:bookingNumber')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약번호로 예약 조회' })
  @ApiResponse({ status: 200, description: '예약을 성공적으로 조회했습니다.' })
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
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
  @ApiResponse({ status: 400, description: '수정할 수 없는 예약입니다.' })
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
  @ApiOperation({ summary: '예약 취소' })
  @ApiResponse({
    status: 200,
    description: '예약이 성공적으로 취소되었습니다.',
  })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
  @ApiResponse({ status: 400, description: '취소할 수 없는 예약입니다.' })
  async cancelBooking(
    @Request() req: any,
    @Param('id') id: number,
    @Body() cancelDto: CancelBookingDto,
  ) {
    this.logger.log(`Cancelling booking ${id} for user ${req.user.userId}`);
    return this.bookingService.cancelBooking(id, req.user.userId, cancelDto.reason);
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

    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    return this.bookingService.getTimeSlotAvailability(gameId, date);
  }
}

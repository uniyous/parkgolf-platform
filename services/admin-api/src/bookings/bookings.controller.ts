import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingService } from './bookings.service';
import { BearerToken } from '../common';
import { CreateBookingDto, UpdateBookingDto } from './dto/booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('api/admin/bookings')
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(private readonly bookingService: BookingService) {}

  // Booking Management
  @Get()
  @ApiOperation({ summary: 'Get bookings list' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by game ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Bookings list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBookings(
    @BearerToken() token: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('gameId') gameId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: Record<string, string | undefined> = {};
    if (status) filters.status = status;
    if (gameId) filters.gameId = gameId;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    this.logger.log(`Fetching bookings - page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`);
    return this.bookingService.getBookings(filters, page, limit, token);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Booking statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBookingStats(
    @BearerToken() token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching booking statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.bookingService.getBookingStats(dateRange, token);
  }

  @Get('stats/revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRevenueStats(
    @BearerToken() token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching revenue statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
    return this.bookingService.getRevenueStats(dateRange, token);
  }

  @Get('payments/list')
  @ApiOperation({ summary: 'Get payments list' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPayments(
    @BearerToken() token: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: Record<string, string | undefined> = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    this.logger.log(`Fetching payments - page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`);
    return this.bookingService.getPayments(filters, page, limit, token);
  }

  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPaymentById(
    @BearerToken() token: string,
    @Param('paymentId') paymentId: string,
  ) {
    this.logger.log(`Fetching payment: ${paymentId}`);
    return this.bookingService.getPaymentById(paymentId, token);
  }

  @Get('history/list')
  @ApiOperation({ summary: 'Get booking history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by game ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Booking history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBookingHistory(
    @BearerToken() token: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('userId') userId?: string,
    @Query('gameId') gameId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: Record<string, string | undefined> = {};
    if (userId) filters.userId = userId;
    if (gameId) filters.gameId = gameId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    this.logger.log(`Fetching booking history - page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`);
    return this.bookingService.getBookingHistory(filters, page, limit, token);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'User bookings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserBookings(
    @BearerToken() token: string,
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching bookings for user: ${userId}`);
    return this.bookingService.getUserBookings(userId, page, limit, token);
  }

  @Get('game/:gameId')
  @ApiOperation({ summary: 'Get game bookings' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Game bookings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGameBookings(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('gameId') gameId: string,
    @Query('date') date?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    this.logger.log(`Fetching bookings for game: ${gameId}, date: ${date || 'all'}`);
    return this.bookingService.getGameBookings(gameId, date, page, limit, token);
  }

  @Get(':bookingId')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBookingById(
    @BearerToken() token: string,
    @Param('bookingId') bookingId: string,
  ) {
    this.logger.log(`Fetching booking: ${bookingId}`);
    return this.bookingService.getBookingById(bookingId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking (admin)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid booking data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createBooking(
    @BearerToken() token: string,
    @Body() bookingData: CreateBookingDto,
  ) {
    this.logger.log('Creating booking (admin)');
    return this.bookingService.createBooking(bookingData, token);
  }

  @Patch(':bookingId')
  @ApiOperation({ summary: 'Update booking' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateBooking(
    @BearerToken() token: string,
    @Param('bookingId') bookingId: string,
    @Body() updateData: UpdateBookingDto,
  ) {
    this.logger.log(`Updating booking: ${bookingId}`);
    return this.bookingService.updateBooking(bookingId, updateData, token);
  }

  @Patch(':bookingId/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelBooking(
    @BearerToken() token: string,
    @Param('bookingId') bookingId: string,
    @Body() body: { reason?: string },
  ) {
    this.logger.log(`Cancelling booking: ${bookingId}`);
    return this.bookingService.cancelBooking(bookingId, body.reason, token);
  }

  @Patch(':bookingId/confirm')
  @ApiOperation({ summary: 'Confirm booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmBooking(
    @BearerToken() token: string,
    @Param('bookingId') bookingId: string,
  ) {
    this.logger.log(`Confirming booking: ${bookingId}`);
    return this.bookingService.confirmBooking(bookingId, token);
  }

  @Patch(':bookingId/complete')
  @ApiOperation({ summary: 'Complete booking' })
  @ApiResponse({ status: 200, description: 'Booking completed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeBooking(
    @BearerToken() token: string,
    @Param('bookingId') bookingId: string,
  ) {
    this.logger.log(`Completing booking: ${bookingId}`);
    return this.bookingService.completeBooking(bookingId, token);
  }

  @Patch(':bookingId/no-show')
  @ApiOperation({ summary: 'Mark booking as no-show' })
  @ApiResponse({ status: 200, description: 'Booking marked as no-show successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markNoShow(
    @BearerToken() token: string,
    @Param('bookingId') bookingId: string,
  ) {
    this.logger.log(`Marking no-show: ${bookingId}`);
    return this.bookingService.markNoShow(bookingId, token);
  }

  @Post('payments/:paymentId/refund')
  @ApiOperation({ summary: 'Process payment refund' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async processRefund(
    @BearerToken() token: string,
    @Param('paymentId') paymentId: string,
    @Body() refundData: Record<string, unknown>,
  ) {
    this.logger.log(`Processing refund for payment: ${paymentId}`);
    return this.bookingService.processRefund(paymentId, refundData, token);
  }
}

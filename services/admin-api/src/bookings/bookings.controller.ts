import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  Query, 
  Headers,
  HttpStatus, 
  HttpException, 
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { BookingService } from './bookings.service';

@ApiTags('bookings')
@Controller('api/admin/bookings')
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(private readonly bookingService: BookingService) {}

  // Booking Management
  @Get()
  @ApiOperation({ summary: 'Get bookings list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by game ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Bookings list retrieved successfully' })
  async getBookings(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('gameId') gameId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const filters: any = {};
      if (status) filters.status = status;
      if (gameId) filters.gameId = gameId;
      if (userId) filters.userId = userId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      this.logger.log(`Fetching bookings - page: ${page}, limit: ${limit}, filters:`, filters);
      
      const result = await this.bookingService.getBookings(filters, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch bookings', error);
      throw this.handleError(error);
    }
  }

  @Get(':bookingId')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  async getBookingById(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching booking: ${bookingId}`);
      
      const result = await this.bookingService.getBookingById(bookingId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch booking: ${bookingId}`, error);
      throw this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking (admin)' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  async createBooking(
    @Body() bookingData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log('Creating booking (admin)');
      
      const result = await this.bookingService.createBooking(bookingData, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to create booking', error);
      throw this.handleError(error);
    }
  }

  @Patch(':bookingId')
  @ApiOperation({ summary: 'Update booking' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  async updateBooking(
    @Param('bookingId') bookingId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Updating booking: ${bookingId}`);
      
      const result = await this.bookingService.updateBooking(bookingId, updateData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update booking: ${bookingId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':bookingId/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() body: { reason?: string },
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Cancelling booking: ${bookingId}`);
      
      const result = await this.bookingService.cancelBooking(bookingId, body.reason, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel booking: ${bookingId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':bookingId/confirm')
  @ApiOperation({ summary: 'Confirm booking' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
  async confirmBooking(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Confirming booking: ${bookingId}`);
      
      const result = await this.bookingService.confirmBooking(bookingId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to confirm booking: ${bookingId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':bookingId/complete')
  @ApiOperation({ summary: 'Complete booking' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Booking completed successfully' })
  async completeBooking(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Completing booking: ${bookingId}`);
      
      const result = await this.bookingService.completeBooking(bookingId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to complete booking: ${bookingId}`, error);
      throw this.handleError(error);
    }
  }

  @Patch(':bookingId/no-show')
  @ApiOperation({ summary: 'Mark booking as no-show' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Booking marked as no-show successfully' })
  async markNoShow(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Marking no-show: ${bookingId}`);
      
      const result = await this.bookingService.markNoShow(bookingId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to mark no-show: ${bookingId}`, error);
      throw this.handleError(error);
    }
  }

  // Payment Management
  @Get('payments/list')
  @ApiOperation({ summary: 'Get payments list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  async getPayments(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      this.logger.log(`Fetching payments - page: ${page}, limit: ${limit}, filters:`, filters);
      
      const result = await this.bookingService.getPayments(filters, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch payments', error);
      throw this.handleError(error);
    }
  }

  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentById(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching payment: ${paymentId}`);
      
      const result = await this.bookingService.getPaymentById(paymentId, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch payment: ${paymentId}`, error);
      throw this.handleError(error);
    }
  }

  @Post('payments/:paymentId/refund')
  @ApiOperation({ summary: 'Process payment refund' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Param('paymentId') paymentId: string,
    @Body() refundData: any,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Processing refund for payment: ${paymentId}`);
      
      const result = await this.bookingService.processRefund(paymentId, refundData, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to process refund for payment: ${paymentId}`, error);
      throw this.handleError(error);
    }
  }

  // Booking History and Analytics
  @Get('history/list')
  @ApiOperation({ summary: 'Get booking history' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by game ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Booking history retrieved successfully' })
  async getBookingHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('userId') userId?: string,
    @Query('gameId') gameId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const filters: any = {};
      if (userId) filters.userId = userId;
      if (gameId) filters.gameId = gameId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      this.logger.log(`Fetching booking history - page: ${page}, limit: ${limit}, filters:`, filters);
      
      const result = await this.bookingService.getBookingHistory(filters, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch booking history', error);
      throw this.handleError(error);
    }
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Booking statistics retrieved successfully' })
  async getBookingStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dateRange = {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching booking statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const result = await this.bookingService.getBookingStats(dateRange, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch booking statistics', error);
      throw this.handleError(error);
    }
  }

  @Get('stats/revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved successfully' })
  async getRevenueStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = this.extractToken(authorization);
      
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dateRange = {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      };
      
      this.logger.log(`Fetching revenue statistics for range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const result = await this.bookingService.getRevenueStats(dateRange, token);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch revenue statistics', error);
      throw this.handleError(error);
    }
  }

  // User and Course specific bookings
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'User bookings retrieved successfully' })
  async getUserBookings(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization: string
  ) {
    try {
      const token = this.extractToken(authorization);
      this.logger.log(`Fetching bookings for user: ${userId}`);
      
      const result = await this.bookingService.getUserBookings(userId, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch bookings for user: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  @Get('game/:gameId')
  @ApiOperation({ summary: 'Get game bookings' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Game bookings retrieved successfully' })
  async getGameBookings(
    @Param('gameId') gameId: string,
    @Query('date') date?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization?: string
  ) {
    try {
      const token = authorization ? this.extractToken(authorization) : undefined;
      this.logger.log(`Fetching bookings for game: ${gameId}, date: ${date || 'all'}`);

      const result = await this.bookingService.getGameBookings(gameId, date, page, limit, token);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch bookings for game: ${gameId}`, error);
      throw this.handleError(error);
    }
  }

  private extractToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          }
        },
        HttpStatus.UNAUTHORIZED
      );
    }
    return authorization.substring(7);
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error.message?.includes('timeout') || error.code === 'ECONNREFUSED') {
      return new HttpException(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Booking service temporarily unavailable',
          }
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
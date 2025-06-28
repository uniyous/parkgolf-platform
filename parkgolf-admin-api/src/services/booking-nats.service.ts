import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class BookingNatsService {
  private readonly logger = new Logger(BookingNatsService.name);

  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  // Booking Management
  async getBookings(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching bookings via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.list', { 
          filters, 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch bookings', error);
      throw error;
    }
  }

  async getBookingById(bookingId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching booking via NATS: ${bookingId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.findById', { 
          bookingId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch booking: ${bookingId}`, error);
      throw error;
    }
  }

  async createBooking(bookingData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log('Creating booking via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.create', { 
          data: bookingData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create booking', error);
      throw error;
    }
  }

  async updateBooking(bookingId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Updating booking via NATS: ${bookingId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.update', { 
          bookingId, 
          data: updateData, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update booking: ${bookingId}`, error);
      throw error;
    }
  }

  async cancelBooking(bookingId: string, reason?: string, adminToken?: string): Promise<any> {
    try {
      this.logger.log(`Cancelling booking via NATS: ${bookingId}`);
      
      const params: any = { bookingId };
      if (reason) params.reason = reason;
      if (adminToken) params.token = adminToken;

      const result = await firstValueFrom(
        this.bookingClient.send('bookings.cancel', params).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel booking: ${bookingId}`, error);
      throw error;
    }
  }

  async confirmBooking(bookingId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Confirming booking via NATS: ${bookingId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.confirm', { 
          bookingId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to confirm booking: ${bookingId}`, error);
      throw error;
    }
  }

  async completeBooking(bookingId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Completing booking via NATS: ${bookingId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.complete', { 
          bookingId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to complete booking: ${bookingId}`, error);
      throw error;
    }
  }

  async markNoShow(bookingId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Marking no-show via NATS: ${bookingId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.noShow', { 
          bookingId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to mark no-show for booking: ${bookingId}`, error);
      throw error;
    }
  }

  // Payment Management
  async getPayments(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching payments via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('payments.list', { 
          filters, 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch payments', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching payment via NATS: ${paymentId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('payments.findById', { 
          paymentId, 
          token: adminToken 
        }).pipe(timeout(5000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch payment: ${paymentId}`, error);
      throw error;
    }
  }

  async processRefund(paymentId: string, refundData: any, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Processing refund via NATS: ${paymentId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('payments.refund', { 
          paymentId, 
          data: refundData, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to process refund for payment: ${paymentId}`, error);
      throw error;
    }
  }

  // Booking History and Analytics
  async getBookingHistory(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching booking history via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.history', { 
          filters, 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch booking history', error);
      throw error;
    }
  }

  async getBookingStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching booking statistics via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.stats', { 
          dateRange, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch booking statistics', error);
      throw error;
    }
  }

  async getRevenueStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching revenue statistics via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('payments.revenueStats', { 
          dateRange, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch revenue statistics', error);
      throw error;
    }
  }

  // User Booking Management
  async getUserBookings(userId: string, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      this.logger.log(`Fetching user bookings via NATS: ${userId}`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('bookings.user', { 
          userId, 
          page, 
          limit, 
          token: adminToken 
        }).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch bookings for user: ${userId}`, error);
      throw error;
    }
  }

  // Course Booking Management  
  async getCourseBookings(courseId: string, date?: string, page = 1, limit = 20, adminToken?: string): Promise<any> {
    try {
      this.logger.log(`Fetching course bookings via NATS: ${courseId}`);
      
      const params: any = { courseId, page, limit };
      if (date) params.date = date;
      if (adminToken) params.token = adminToken;

      const result = await firstValueFrom(
        this.bookingClient.send('bookings.course', params).pipe(timeout(10000))
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch bookings for course: ${courseId}`, error);
      throw error;
    }
  }

  // Dashboard Analytics
  async getDashboardStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      this.logger.log('Fetching dashboard statistics via NATS');
      
      const result = await firstValueFrom(
        this.bookingClient.send('dashboard.stats', { 
          dateRange, 
          token: adminToken 
        }).pipe(timeout(15000))
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch dashboard statistics', error);
      throw error;
    }
  }

  onModuleInit() {
    this.bookingClient.connect();
  }

  onModuleDestroy() {
    this.bookingClient.close();
  }
}
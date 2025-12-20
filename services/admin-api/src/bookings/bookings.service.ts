import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../shared/nats';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // Booking Management
  async getBookings(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching bookings');
    return this.natsClient.send('bookings.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getBookingById(bookingId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching booking: ${bookingId}`);
    return this.natsClient.send('bookings.findById', {
      bookingId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async createBooking(bookingData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating booking');
    return this.natsClient.send('bookings.create', {
      data: bookingData,
      token: adminToken,
    });
  }

  async updateBooking(bookingId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating booking: ${bookingId}`);
    return this.natsClient.send('bookings.update', {
      bookingId,
      data: updateData,
      token: adminToken,
    });
  }

  async cancelBooking(bookingId: string, reason?: string, adminToken?: string): Promise<any> {
    this.logger.log(`Cancelling booking: ${bookingId}`);
    const params: any = { bookingId };
    if (reason) params.reason = reason;
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('bookings.cancel', params);
  }

  async confirmBooking(bookingId: string, adminToken: string): Promise<any> {
    this.logger.log(`Confirming booking: ${bookingId}`);
    return this.natsClient.send('bookings.confirm', {
      bookingId,
      token: adminToken,
    });
  }

  async completeBooking(bookingId: string, adminToken: string): Promise<any> {
    this.logger.log(`Completing booking: ${bookingId}`);
    return this.natsClient.send('bookings.complete', {
      bookingId,
      token: adminToken,
    });
  }

  async markNoShow(bookingId: string, adminToken: string): Promise<any> {
    this.logger.log(`Marking no-show: ${bookingId}`);
    return this.natsClient.send('bookings.noShow', {
      bookingId,
      token: adminToken,
    });
  }

  // Payment Management
  async getPayments(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching payments');
    return this.natsClient.send('payments.list', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getPaymentById(paymentId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching payment: ${paymentId}`);
    return this.natsClient.send('payments.findById', {
      paymentId,
      token: adminToken,
    }, NATS_TIMEOUTS.QUICK);
  }

  async processRefund(paymentId: string, refundData: any, adminToken: string): Promise<any> {
    this.logger.log(`Processing refund: ${paymentId}`);
    return this.natsClient.send('payments.refund', {
      paymentId,
      data: refundData,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // Booking History and Analytics
  async getBookingHistory(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching booking history');
    return this.natsClient.send('bookings.history', {
      filters,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getBookingStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching booking statistics');
    return this.natsClient.send('bookings.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  async getRevenueStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching revenue statistics');
    return this.natsClient.send('payments.revenueStats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }

  // User Booking Management
  async getUserBookings(userId: string, page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log(`Fetching user bookings: ${userId}`);
    return this.natsClient.send('bookings.user', {
      userId,
      page,
      limit,
      token: adminToken,
    }, NATS_TIMEOUTS.LIST_QUERY);
  }

  // Course Booking Management
  async getCourseBookings(courseId: string, date?: string, page = 1, limit = 20, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching course bookings: ${courseId}`);
    const params: any = { courseId, page, limit };
    if (date) params.date = date;
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('bookings.course', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  // Dashboard Analytics
  async getDashboardStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    this.logger.log('Fetching dashboard statistics');
    return this.natsClient.send('dashboard.stats', {
      dateRange,
      token: adminToken,
    }, NATS_TIMEOUTS.ANALYTICS);
  }
}

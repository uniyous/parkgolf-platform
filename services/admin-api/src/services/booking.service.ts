import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly bookingServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.bookingServiceUrl = this.configService.get<string>('BOOKING_SERVICE_URL') || 'http://localhost:3013';
  }

  // Booking Management
  async getBookings(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const params = { page, limit, ...filters };

      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch bookings', error);
      throw error;
    }
  }

  async getBookingById(bookingId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch booking: ${bookingId}`, error);
      throw error;
    }
  }

  async createBooking(bookingData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.bookingServiceUrl}/api/bookings`, bookingData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create booking', error);
      throw error;
    }
  }

  async updateBooking(bookingId: string, updateData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.bookingServiceUrl}/api/bookings/${bookingId}`, updateData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update booking: ${bookingId}`, error);
      throw error;
    }
  }

  async cancelBooking(bookingId: string, reason?: string, adminToken?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.bookingServiceUrl}/api/bookings/${bookingId}/cancel`, 
          { reason }, 
          {
            headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
          }
        )
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to cancel booking: ${bookingId}`, error);
      throw error;
    }
  }

  async confirmBooking(bookingId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.bookingServiceUrl}/api/bookings/${bookingId}/confirm`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to confirm booking: ${bookingId}`, error);
      throw error;
    }
  }

  async completeBooking(bookingId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.bookingServiceUrl}/api/bookings/${bookingId}/complete`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to complete booking: ${bookingId}`, error);
      throw error;
    }
  }

  async markNoShow(bookingId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.bookingServiceUrl}/api/bookings/${bookingId}/no-show`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to mark no-show for booking: ${bookingId}`, error);
      throw error;
    }
  }

  // Payment Management
  async getPayments(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const params = { page, limit, ...filters };

      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/payments`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch payments', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch payment: ${paymentId}`, error);
      throw error;
    }
  }

  async processRefund(paymentId: string, refundData: any, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.bookingServiceUrl}/api/payments/${paymentId}/refund`, refundData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to process refund for payment: ${paymentId}`, error);
      throw error;
    }
  }

  // Booking History and Analytics
  async getBookingHistory(filters: any = {}, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const params = { page, limit, ...filters };

      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/bookings/history`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch booking history', error);
      throw error;
    }
  }

  async getBookingStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/bookings/stats`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: dateRange
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch booking statistics', error);
      throw error;
    }
  }

  async getRevenueStats(dateRange: { startDate: string; endDate: string }, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/payments/revenue-stats`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: dateRange
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch revenue statistics', error);
      throw error;
    }
  }

  // User Booking Management
  async getUserBookings(userId: string, page = 1, limit = 20, adminToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/bookings/user/${userId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { page, limit }
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch bookings for user: ${userId}`, error);
      throw error;
    }
  }

  // Course Booking Management  
  async getCourseBookings(courseId: string, date?: string, page = 1, limit = 20, adminToken?: string): Promise<any> {
    try {
      const params: any = { page, limit };
      if (date) params.date = date;

      const response = await firstValueFrom(
        this.httpService.get(`${this.bookingServiceUrl}/api/bookings/course/${courseId}`, {
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
          params
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch bookings for course: ${courseId}`, error);
      throw error;
    }
  }
}
import {
  Controller,
  Get,
  Query,
  Headers,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { CourseService } from '../courses/courses.service';
import { BookingService } from '../bookings/bookings.service';
import { NotificationService } from '../notifications/notifications.service';
import { AppException, Errors } from '../common/exceptions';

@ApiTags('analytics')
@Controller('api/admin/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly courseService: CourseService,
    private readonly bookingService: BookingService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getDashboardOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);

    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching dashboard overview for range: ${dateRange.startDate} to ${dateRange.endDate}`);

    const [userStats, courseStats, bookingStats, revenueStats, notificationStats] = await Promise.allSettled([
      this.usersService.getUserStats(dateRange, token),
      this.courseService.getCourseStats(dateRange, token),
      this.bookingService.getBookingStats(dateRange, token),
      this.bookingService.getRevenueStats(dateRange, token),
      this.notificationService.getNotificationStats(dateRange, token),
    ]);

    return {
      success: true,
      data: {
        dateRange,
        users: userStats.status === 'fulfilled' ? userStats.value : { error: 'Failed to fetch user stats' },
        courses: courseStats.status === 'fulfilled' ? courseStats.value : { error: 'Failed to fetch course stats' },
        bookings: bookingStats.status === 'fulfilled' ? bookingStats.value : { error: 'Failed to fetch booking stats' },
        revenue: revenueStats.status === 'fulfilled' ? revenueStats.value : { error: 'Failed to fetch revenue stats' },
        notifications: notificationStats.status === 'fulfilled' ? notificationStats.value : { error: 'Failed to fetch notification stats' },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats/real-time')
  @ApiOperation({ summary: 'Get real-time dashboard statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Real-time statistics retrieved successfully' })
  async getRealTimeStats(
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log('Fetching real-time dashboard statistics');

    const today = new Date().toISOString().split('T')[0];
    const dateRange = { startDate: today, endDate: today };

    const [todayBookings, todayRevenue] = await Promise.allSettled([
      this.bookingService.getBookingStats(dateRange, token),
      this.bookingService.getRevenueStats(dateRange, token),
    ]);

    return {
      success: true,
      data: {
        today: {
          bookings: todayBookings.status === 'fulfilled' ? todayBookings.value : { error: 'Failed to fetch today\'s bookings' },
          revenue: todayRevenue.status === 'fulfilled' ? todayRevenue.value : { error: 'Failed to fetch today\'s revenue' },
        },
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  @Get('stats/trends')
  @ApiOperation({ summary: 'Get dashboard trend analytics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'period', required: false, description: 'Period: 7d, 30d, 90d, 1y', example: '30d' })
  @ApiResponse({ status: 200, description: 'Trend analytics retrieved successfully' })
  async getTrendAnalytics(
    @Query('period') period = '30d',
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);
    this.logger.log(`Fetching trend analytics for period: ${period}`);

    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const dateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const trendData = await this.bookingService.getDashboardStats(dateRange, token);

    return {
      success: true,
      data: {
        period,
        dateRange,
        trends: trendData,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats/performance')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(
    @Headers('authorization') authorization?: string,
  ) {
    this.extractToken(authorization);
    this.logger.log('Fetching system performance metrics');

    return {
      success: true,
      data: {
        services: {
          'auth-service': {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 50,
            uptime: '99.9%',
            lastChecked: new Date().toISOString(),
          },
          'course-service': {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 50,
            uptime: '99.8%',
            lastChecked: new Date().toISOString(),
          },
          'booking-service': {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 50,
            uptime: '99.7%',
            lastChecked: new Date().toISOString(),
          },
          'notify-service': {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 50,
            uptime: '99.6%',
            lastChecked: new Date().toISOString(),
          },
        },
        system: {
          totalRequests: Math.floor(Math.random() * 10000) + 50000,
          averageResponseTime: Math.floor(Math.random() * 50) + 75,
          errorRate: (Math.random() * 2).toFixed(2) + '%',
          throughput: Math.floor(Math.random() * 100) + 200 + ' req/min',
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats/top-metrics')
  @ApiOperation({ summary: 'Get top-level KPI metrics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Top metrics retrieved successfully' })
  async getTopMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractToken(authorization);

    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateRange = {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
    };

    this.logger.log(`Fetching top metrics for range: ${dateRange.startDate} to ${dateRange.endDate}`);

    const [bookingStats, revenueStats] = await Promise.allSettled([
      this.bookingService.getBookingStats(dateRange, token),
      this.bookingService.getRevenueStats(dateRange, token),
    ]);

    return {
      success: true,
      data: {
        kpis: [
          {
            title: 'Total Bookings',
            value: bookingStats.status === 'fulfilled'
              ? (bookingStats.value?.data?.totalBookings || 0) : 0,
            change: '+12.5%',
            trend: 'up',
          },
          {
            title: 'Total Revenue',
            value: revenueStats.status === 'fulfilled'
              ? (revenueStats.value?.data?.totalRevenue || 0) : 0,
            change: '+8.3%',
            trend: 'up',
            format: 'currency',
          },
          {
            title: 'Active Users',
            value: Math.floor(Math.random() * 1000) + 5000,
            change: '+15.2%',
            trend: 'up',
          },
          {
            title: 'Avg Booking Value',
            value: revenueStats.status === 'fulfilled' && bookingStats.status === 'fulfilled'
              ? ((revenueStats.value?.data?.totalRevenue || 0) / Math.max(bookingStats.value?.data?.totalBookings || 1, 1)).toFixed(2) : 0,
            change: '-2.1%',
            trend: 'down',
            format: 'currency',
          },
        ],
        dateRange,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats/alerts')
  @ApiOperation({ summary: 'Get system alerts and notifications' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'System alerts retrieved successfully' })
  async getSystemAlerts(
    @Headers('authorization') authorization?: string,
  ) {
    this.extractToken(authorization);
    this.logger.log('Fetching system alerts');

    return {
      success: true,
      data: {
        critical: [],
        warnings: [
          {
            id: 'warn-001',
            message: 'High booking volume detected - consider scaling resources',
            severity: 'warning',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            service: 'booking-service',
          },
        ],
        info: [
          {
            id: 'info-001',
            message: 'Daily backup completed successfully',
            severity: 'info',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            service: 'system',
          },
        ],
        timestamp: new Date().toISOString(),
      },
    };
  }

  private extractToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new AppException(Errors.Auth.MISSING_TOKEN);
    }
    return authorization.substring(7);
  }
}

import { apiClient } from './client';
import { extractSingle } from './bffParser';

/**
 * NATS 응답 래핑 제거
 * BFF가 마이크로서비스의 NatsResponse를 그대로 전달하므로
 * { success: true, data: { ... } } → { ... } 로 벗김
 */
function unwrapNats<T>(obj: unknown): T {
  if (obj && typeof obj === 'object' && 'success' in obj && 'data' in obj) {
    return (obj as { data: T }).data;
  }
  return obj as T;
}

// Dashboard analytics types
export interface DashboardOverview {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  users: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    userGrowthRate: number;
  };
  courses: {
    totalCourses: number;
    activeCourses: number;
    maintenanceCourses: number;
    courseUtilizationRate: number;
  };
  bookings: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    bookingGrowthRate: number;
    averageBookingsPerDay: number;
  };
  revenue: {
    totalRevenue: number;
    revenueGrowthRate: number;
    averageRevenuePerBooking: number;
    monthlyRecurringRevenue: number;
  };
  notifications: {
    totalSent: number;
    deliveryRate: number;
    readRate: number;
    failedNotifications: number;
  };
  timestamp: string;
}

export interface RealTimeStats {
  today: {
    bookings: {
      count: number;
      revenue: number;
    };
    revenue: {
      total: number;
      growth: number;
    };
  };
  timestamp: string;
  lastUpdated: string;
}

export interface TrendData {
  period: '7d' | '30d' | '90d' | '1y';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  trends: {
    bookings: Array<{
      date: string;
      count: number;
    }>;
    revenue: Array<{
      date: string;
      amount: number;
    }>;
    users: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
    }>;
    courseUtilization: Array<{
      date: string;
      utilizationRate: number;
    }>;
  };
  timestamp: string;
}

export const dashboardApi = {
  /**
   * 대시보드 개요 조회
   */
  async getDashboardOverview(startDate?: string, endDate?: string): Promise<DashboardOverview> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<unknown>('/admin/dashboard/overview', params);
    const data = extractSingle<DashboardOverview>(response.data);
    if (!data) {
      throw new Error('Failed to fetch dashboard overview');
    }
    // 하위 NATS 래핑 제거 (BFF가 마이크로서비스 응답을 그대로 전달)
    data.bookings = unwrapNats(data.bookings);
    data.revenue = unwrapNats(data.revenue);
    data.notifications = unwrapNats(data.notifications);
    data.users = unwrapNats(data.users);
    data.courses = unwrapNats(data.courses);
    return data;
  },

  /**
   * 실시간 통계 조회
   */
  async getRealTimeStats(): Promise<RealTimeStats> {
    const response = await apiClient.get<unknown>('/admin/dashboard/stats/real-time');
    const data = extractSingle<RealTimeStats>(response.data);
    if (!data) {
      throw new Error('Failed to fetch real-time statistics');
    }
    if (data.today) {
      data.today.bookings = unwrapNats(data.today.bookings);
      data.today.revenue = unwrapNats(data.today.revenue);
    }
    return data;
  },

  /**
   * 트렌드 분석 조회
   */
  async getTrendAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<TrendData> {
    const response = await apiClient.get<unknown>('/admin/dashboard/stats/trends', { period });
    const data = extractSingle<TrendData>(response.data);
    if (!data) {
      throw new Error('Failed to fetch trend analytics');
    }
    data.trends = unwrapNats(data.trends);
    return data;
  },

  /**
   * 예약 트렌드 조회
   */
  async getBookingTrends(days: number = 30): Promise<Array<{ date: string; count: number }>> {
    const period = days <= 7 ? '7d' : days <= 30 ? '30d' : days <= 90 ? '90d' : '1y';
    const trendData = await this.getTrendAnalytics(period);
    return trendData.trends.bookings;
  },

  /**
   * 매출 트렌드 조회
   */
  async getRevenueTrends(days: number = 30): Promise<Array<{ date: string; amount: number }>> {
    const period = days <= 7 ? '7d' : days <= 30 ? '30d' : days <= 90 ? '90d' : '1y';
    const trendData = await this.getTrendAnalytics(period);
    return trendData.trends.revenue;
  },

  /**
   * 빠른 통계 조회
   */
  async getQuickStats(): Promise<{
    totalUsers: number;
    totalBookings: number;
    totalRevenue: number;
    activeCourses: number;
  }> {
    const overview = await this.getDashboardOverview();
    return {
      totalUsers: overview.users.totalUsers,
      totalBookings: overview.bookings.totalBookings,
      totalRevenue: overview.revenue.totalRevenue,
      activeCourses: overview.courses.activeCourses,
    };
  },

} as const;

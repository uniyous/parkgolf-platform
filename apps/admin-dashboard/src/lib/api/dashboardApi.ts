import { apiClient } from './client';
import { extractSingle } from './bffParser';

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

export interface PerformanceMetrics {
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number; // ms
      uptime: string;
      lastChecked: string;
    };
  };
  system: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: string;
    throughput: string;
  };
  timestamp: string;
}

export interface TopMetrics {
  kpis: Array<{
    title: string;
    value: number | string;
    change: string;
    trend: 'up' | 'down' | 'stable';
    format?: 'currency' | 'percentage' | 'number';
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  timestamp: string;
}

export interface SystemAlerts {
  critical: Array<{
    id: string;
    message: string;
    severity: 'critical';
    timestamp: string;
    service: string;
  }>;
  warnings: Array<{
    id: string;
    message: string;
    severity: 'warning';
    timestamp: string;
    service: string;
  }>;
  info: Array<{
    id: string;
    message: string;
    severity: 'info';
    timestamp: string;
    service: string;
  }>;
  timestamp: string;
}

export interface CourseAnalytics {
  popularCourses: Array<{
    courseId: number;
    courseName: string;
    bookingCount: number;
    revenue: number;
    utilizationRate: number;
  }>;
  coursePerformance: Array<{
    courseId: number;
    courseName: string;
    bookings: number;
    revenue: number;
    averageRating: number;
    cancellationRate: number;
  }>;
  timeSlotAnalytics: Array<{
    timeSlot: string;
    bookingCount: number;
    popularityScore: number;
  }>;
}

export interface UserAnalytics {
  userDemographics: {
    byAge: Array<{
      ageGroup: string;
      count: number;
    }>;
    byLocation: Array<{
      location: string;
      count: number;
    }>;
    byMembershipType: Array<{
      type: string;
      count: number;
    }>;
  };
  userBehavior: {
    averageBookingsPerUser: number;
    averageRevenuePerUser: number;
    retentionRate: number;
    churnRate: number;
  };
  topUsers: Array<{
    userId: number;
    username: string;
    totalBookings: number;
    totalRevenue: number;
    lastBookingDate: string;
  }>;
}

export interface RevenueAnalytics {
  revenueBreakdown: {
    byMonth: Array<{
      month: string;
      revenue: number;
      bookings: number;
    }>;
    byCourse: Array<{
      courseId: number;
      courseName: string;
      revenue: number;
      percentage: number;
    }>;
    byPaymentMethod: Array<{
      method: string;
      revenue: number;
      percentage: number;
    }>;
  };
  projections: {
    nextMonthRevenue: number;
    nextQuarterRevenue: number;
    annualRevenue: number;
  };
  metrics: {
    averageRevenuePerUser: number;
    customerLifetimeValue: number;
    revenueGrowthRate: number;
  };
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
    return data;
  },

  /**
   * 성능 메트릭 조회
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await apiClient.get<unknown>('/admin/dashboard/stats/performance');
    const data = extractSingle<PerformanceMetrics>(response.data);
    if (!data) {
      throw new Error('Failed to fetch performance metrics');
    }
    return data;
  },

  /**
   * 주요 메트릭 조회
   */
  async getTopMetrics(startDate?: string, endDate?: string): Promise<TopMetrics> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<unknown>('/admin/dashboard/stats/top-metrics', params);
    const data = extractSingle<TopMetrics>(response.data);
    if (!data) {
      throw new Error('Failed to fetch top metrics');
    }
    return data;
  },

  /**
   * 시스템 알림 조회
   */
  async getSystemAlerts(): Promise<SystemAlerts> {
    const response = await apiClient.get<unknown>('/admin/dashboard/stats/alerts');
    const data = extractSingle<SystemAlerts>(response.data);
    if (!data) {
      throw new Error('Failed to fetch system alerts');
    }
    return data;
  },

  /**
   * 코스 분석 조회
   */
  async getCourseAnalytics(startDate?: string, endDate?: string): Promise<CourseAnalytics> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<unknown>('/admin/dashboard/analytics/courses', params);
    const data = extractSingle<CourseAnalytics>(response.data);
    if (!data) {
      throw new Error('Failed to fetch course analytics');
    }
    return data;
  },

  /**
   * 사용자 분석 조회
   */
  async getUserAnalytics(startDate?: string, endDate?: string): Promise<UserAnalytics> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<unknown>('/admin/dashboard/analytics/users', params);
    const data = extractSingle<UserAnalytics>(response.data);
    if (!data) {
      throw new Error('Failed to fetch user analytics');
    }
    return data;
  },

  /**
   * 매출 분석 조회
   */
  async getRevenueAnalytics(startDate?: string, endDate?: string): Promise<RevenueAnalytics> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<unknown>('/admin/dashboard/analytics/revenue', params);
    const data = extractSingle<RevenueAnalytics>(response.data);
    if (!data) {
      throw new Error('Failed to fetch revenue analytics');
    }
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

  /**
   * 서비스 상태 조회
   */
  async getServiceHealth(): Promise<PerformanceMetrics['services']> {
    const performance = await this.getPerformanceMetrics();
    return performance.services;
  },
} as const;

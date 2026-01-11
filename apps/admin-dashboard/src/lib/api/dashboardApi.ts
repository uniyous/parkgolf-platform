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
  // Main dashboard data
  async getDashboardOverview(startDate?: string, endDate?: string): Promise<DashboardOverview> {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get<unknown>('/admin/dashboard/overview', params);
      const data = extractSingle<DashboardOverview>(response.data);
      if (!data) {
        throw new Error('Failed to fetch dashboard overview');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch dashboard overview:', error);
      throw error;
    }
  },

  async getRealTimeStats(): Promise<RealTimeStats> {
    try {
      const response = await apiClient.get<unknown>('/admin/dashboard/stats/real-time');
      const data = extractSingle<RealTimeStats>(response.data);
      if (!data) {
        throw new Error('Failed to fetch real-time statistics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch real-time statistics:', error);
      throw error;
    }
  },

  async getTrendAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<TrendData> {
    try {
      const response = await apiClient.get<unknown>('/admin/dashboard/stats/trends', { period });
      const data = extractSingle<TrendData>(response.data);
      if (!data) {
        throw new Error('Failed to fetch trend analytics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch trend analytics:', error);
      throw error;
    }
  },

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const response = await apiClient.get<unknown>('/admin/dashboard/stats/performance');
      const data = extractSingle<PerformanceMetrics>(response.data);
      if (!data) {
        throw new Error('Failed to fetch performance metrics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      throw error;
    }
  },

  async getTopMetrics(startDate?: string, endDate?: string): Promise<TopMetrics> {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get<unknown>('/admin/dashboard/stats/top-metrics', params);
      const data = extractSingle<TopMetrics>(response.data);
      if (!data) {
        throw new Error('Failed to fetch top metrics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch top metrics:', error);
      throw error;
    }
  },

  async getSystemAlerts(): Promise<SystemAlerts> {
    try {
      const response = await apiClient.get<unknown>('/admin/dashboard/stats/alerts');
      const data = extractSingle<SystemAlerts>(response.data);
      if (!data) {
        throw new Error('Failed to fetch system alerts');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch system alerts:', error);
      throw error;
    }
  },

  // Specific analytics
  async getCourseAnalytics(startDate?: string, endDate?: string): Promise<CourseAnalytics> {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get<unknown>('/admin/dashboard/analytics/courses', params);
      const data = extractSingle<CourseAnalytics>(response.data);
      if (!data) {
        throw new Error('Failed to fetch course analytics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch course analytics:', error);
      throw error;
    }
  },

  async getUserAnalytics(startDate?: string, endDate?: string): Promise<UserAnalytics> {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get<unknown>('/admin/dashboard/analytics/users', params);
      const data = extractSingle<UserAnalytics>(response.data);
      if (!data) {
        throw new Error('Failed to fetch user analytics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch user analytics:', error);
      throw error;
    }
  },

  async getRevenueAnalytics(startDate?: string, endDate?: string): Promise<RevenueAnalytics> {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get<unknown>('/admin/dashboard/analytics/revenue', params);
      const data = extractSingle<RevenueAnalytics>(response.data);
      if (!data) {
        throw new Error('Failed to fetch revenue analytics');
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
      throw error;
    }
  },

  // Helper methods for specific data
  async getBookingTrends(days: number = 30): Promise<Array<{ date: string; count: number }>> {
    try {
      const trendData = await this.getTrendAnalytics(days <= 7 ? '7d' : days <= 30 ? '30d' : days <= 90 ? '90d' : '1y');
      return trendData.trends.bookings;
    } catch (error) {
      console.error('Failed to fetch booking trends:', error);
      throw error;
    }
  },

  async getRevenueTrends(days: number = 30): Promise<Array<{ date: string; amount: number }>> {
    try {
      const trendData = await this.getTrendAnalytics(days <= 7 ? '7d' : days <= 30 ? '30d' : days <= 90 ? '90d' : '1y');
      return trendData.trends.revenue;
    } catch (error) {
      console.error('Failed to fetch revenue trends:', error);
      throw error;
    }
  },

  async getQuickStats(): Promise<{
    totalUsers: number;
    totalBookings: number;
    totalRevenue: number;
    activeCourses: number;
  }> {
    try {
      const overview = await this.getDashboardOverview();
      return {
        totalUsers: overview.users.totalUsers,
        totalBookings: overview.bookings.totalBookings,
        totalRevenue: overview.revenue.totalRevenue,
        activeCourses: overview.courses.activeCourses,
      };
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
      throw error;
    }
  },

  // Real-time monitoring
  async getServiceHealth(): Promise<PerformanceMetrics['services']> {
    try {
      const performance = await this.getPerformanceMetrics();
      return performance.services;
    } catch (error) {
      console.error('Failed to fetch service health:', error);
      throw error;
    }
  }
} as const;

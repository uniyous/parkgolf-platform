export interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  totalCourses: number;
  activeCourses: number;
  totalUsers: number;
  activeUsers: number;
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  monthGrowth: number;
  todayRevenue: number;
  averageBookingValue: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface BookingTrendsData {
  hourly: { hour: string; bookings: number }[];
  daily: { day: string; bookings: number }[];
}

export interface PopularCourse {
  id: number;
  name: string;
  companyName: string;
  bookings: number;
  revenue: number;
  growth: number;
}

export interface RecentBooking {
  id: number;
  userName: string;
  courseName: string;
  date: string;
  time: string;
  players: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  amount: number;
  createdAt: Date;
}

export interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  icon: string;
  color: string;
}

export interface Notification {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface SystemHealth {
  apiStatus: 'operational' | 'degraded' | 'down';
  databaseStatus: 'operational' | 'degraded' | 'down';
  cacheStatus: 'operational' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  errorRate: number;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueData: RevenueData[];
  bookingTrends: BookingTrendsData;
  popularCourses: PopularCourse[];
  recentBookings: RecentBooking[];
  activities: Activity[];
  notifications: Notification[];
  systemHealth: SystemHealth;
}
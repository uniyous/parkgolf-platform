import React, { useState, useEffect } from 'react';
import { StatsOverview } from './StatsOverview';
import { RevenueChart } from './RevenueChart';
import { BookingTrendsChart } from './BookingTrendsChart';
import { PopularCoursesWidget } from './PopularCoursesWidget';
import { RecentBookingsWidget } from './RecentBookingsWidget';
import { ActivityTimeline } from './ActivityTimeline';
import { QuickActions } from './QuickActions';
import { SystemHealthWidget } from './SystemHealthWidget';
import { WeatherWidget } from './WeatherWidget';
import { NotificationPanel } from './NotificationPanel';
import type { DashboardData } from '@/types/dashboard';

// Mock data for development
const mockDashboardData: DashboardData = {
  stats: {
    totalCompanies: 20,
    activeCompanies: 18,
    totalCourses: 48,
    activeCourses: 45,
    totalUsers: 1250,
    activeUsers: 980,
    todayBookings: 124,
    weekBookings: 752,
    monthRevenue: 45680000,
    monthGrowth: 12.5,
    todayRevenue: 2150000,
    averageBookingValue: 35000
  },
  revenueData: [
    { date: '2024-07-01', revenue: 1250000, bookings: 35 },
    { date: '2024-07-02', revenue: 1480000, bookings: 42 },
    { date: '2024-07-03', revenue: 1320000, bookings: 38 },
    { date: '2024-07-04', revenue: 1650000, bookings: 47 },
    { date: '2024-07-05', revenue: 1890000, bookings: 54 },
    { date: '2024-07-06', revenue: 2250000, bookings: 64 },
    { date: '2024-07-07', revenue: 2150000, bookings: 61 }
  ],
  bookingTrends: {
    hourly: [
      { hour: '06:00', bookings: 15 },
      { hour: '07:00', bookings: 28 },
      { hour: '08:00', bookings: 45 },
      { hour: '09:00', bookings: 62 },
      { hour: '10:00', bookings: 58 },
      { hour: '11:00', bookings: 42 },
      { hour: '12:00', bookings: 35 },
      { hour: '13:00', bookings: 48 },
      { hour: '14:00', bookings: 55 },
      { hour: '15:00', bookings: 52 },
      { hour: '16:00', bookings: 38 },
      { hour: '17:00', bookings: 25 },
      { hour: '18:00', bookings: 12 }
    ],
    daily: [
      { day: 'Mon', bookings: 85 },
      { day: 'Tue', bookings: 92 },
      { day: 'Wed', bookings: 88 },
      { day: 'Thu', bookings: 95 },
      { day: 'Fri', bookings: 110 },
      { day: 'Sat', bookings: 145 },
      { day: 'Sun', bookings: 138 }
    ]
  },
  popularCourses: [
    { id: 1, name: '그린밸리 동코스', companyName: '그린밸리 골프클럽', bookings: 245, revenue: 8575000, growth: 15.2 },
    { id: 2, name: '선셋힐 서코스', companyName: '선셋힐 컨트리클럽', bookings: 198, revenue: 6930000, growth: 8.5 },
    { id: 3, name: '오션뷰 남코스', companyName: '오션뷰 리조트', bookings: 176, revenue: 6160000, growth: 22.1 },
    { id: 4, name: '마운틴피크 북코스', companyName: '마운틴 피크 골프', bookings: 165, revenue: 5775000, growth: -5.3 },
    { id: 5, name: '레이크사이드 동코스', companyName: '레이크사이드 클럽', bookings: 152, revenue: 5320000, growth: 12.8 }
  ],
  recentBookings: [
    {
      id: 1,
      userName: '김민수',
      courseName: '그린밸리 동코스',
      date: '2024-07-07',
      time: '08:00',
      players: 4,
      status: 'CONFIRMED',
      amount: 140000,
      createdAt: new Date('2024-07-07T14:30:00')
    },
    {
      id: 2,
      userName: '이성호',
      courseName: '선셋힐 서코스',
      date: '2024-07-07',
      time: '09:30',
      players: 3,
      status: 'PENDING',
      amount: 105000,
      createdAt: new Date('2024-07-07T14:25:00')
    },
    {
      id: 3,
      userName: '박지영',
      courseName: '오션뷰 남코스',
      date: '2024-07-08',
      time: '07:00',
      players: 2,
      status: 'CONFIRMED',
      amount: 70000,
      createdAt: new Date('2024-07-07T14:20:00')
    },
    {
      id: 4,
      userName: '최수진',
      courseName: '마운틴피크 북코스',
      date: '2024-07-07',
      time: '10:00',
      players: 4,
      status: 'CANCELLED',
      amount: 140000,
      createdAt: new Date('2024-07-07T14:15:00')
    },
    {
      id: 5,
      userName: '정민철',
      courseName: '레이크사이드 동코스',
      date: '2024-07-07',
      time: '14:00',
      players: 3,
      status: 'CONFIRMED',
      amount: 105000,
      createdAt: new Date('2024-07-07T14:10:00')
    }
  ],
  activities: [
    {
      id: 1,
      type: 'booking_created',
      title: '새 예약 생성',
      description: '김민수님이 그린밸리 동코스를 예약했습니다.',
      timestamp: new Date('2024-07-07T14:30:00'),
      user: '김민수',
      icon: '📅',
      color: 'blue'
    },
    {
      id: 2,
      type: 'course_updated',
      title: '코스 정보 수정',
      description: '선셋힐 서코스의 운영 시간이 변경되었습니다.',
      timestamp: new Date('2024-07-07T14:00:00'),
      user: '관리자',
      icon: '⛳',
      color: 'green'
    },
    {
      id: 3,
      type: 'user_registered',
      title: '신규 회원 가입',
      description: '새로운 사용자가 등록되었습니다.',
      timestamp: new Date('2024-07-07T13:45:00'),
      user: '홍길동',
      icon: '👤',
      color: 'purple'
    },
    {
      id: 4,
      type: 'payment_received',
      title: '결제 완료',
      description: '₩140,000 결제가 완료되었습니다.',
      timestamp: new Date('2024-07-07T13:30:00'),
      user: '시스템',
      icon: '💰',
      color: 'green'
    },
    {
      id: 5,
      type: 'booking_cancelled',
      title: '예약 취소',
      description: '최수진님이 예약을 취소했습니다.',
      timestamp: new Date('2024-07-07T13:15:00'),
      user: '최수진',
      icon: '❌',
      color: 'red'
    }
  ],
  notifications: [
    {
      id: 1,
      type: 'info',
      title: '시스템 점검 예정',
      message: '7월 10일 02:00-04:00 시스템 점검이 예정되어 있습니다.',
      timestamp: new Date('2024-07-07T10:00:00'),
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: '미확인 예약 5건',
      message: '확인이 필요한 예약이 5건 있습니다.',
      timestamp: new Date('2024-07-07T09:30:00'),
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: '월간 목표 달성',
      message: '7월 예약 목표를 120% 달성했습니다!',
      timestamp: new Date('2024-07-07T09:00:00'),
      read: true
    }
  ],
  systemHealth: {
    apiStatus: 'operational',
    databaseStatus: 'operational',
    cacheStatus: 'operational',
    responseTime: 125,
    uptime: 99.98,
    errorRate: 0.02
  }
};

export const DashboardContainer: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>(mockDashboardData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [showNotifications, setShowNotifications] = useState(false);

  // Simulate data refresh
  useEffect(() => {
    const interval = setInterval(() => {
      // Update some real-time data
      setDashboardData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          todayBookings: prev.stats.todayBookings + Math.floor(Math.random() * 3),
          todayRevenue: prev.stats.todayRevenue + Math.floor(Math.random() * 50000)
        }
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    // TODO: Fetch real data from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleTimeRangeChange = (range: 'today' | 'week' | 'month') => {
    setSelectedTimeRange(range);
    // TODO: Fetch data for selected time range
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-sm text-gray-600">
            파크골프 플랫폼의 실시간 현황과 통계를 확인하세요
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-4 py-2 text-sm font-medium ${
                  selectedTimeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${
                  range === 'today' ? 'rounded-l-lg' : ''
                } ${
                  range === 'month' ? 'rounded-r-lg' : ''
                } transition-colors`}
              >
                {range === 'today' ? '오늘' : range === 'week' ? '이번 주' : '이번 달'}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            title="새로고침"
          >
            <svg 
              className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Notifications Button */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {dashboardData.notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white">
                  {dashboardData.notifications.filter(n => !n.read).length}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Overview */}
      <StatsOverview stats={dashboardData.stats} isLoading={isLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <RevenueChart data={dashboardData.revenueData} timeRange={selectedTimeRange} />
          
          {/* Booking Trends */}
          <BookingTrendsChart data={dashboardData.bookingTrends} />
          
          {/* Popular Courses */}
          <PopularCoursesWidget courses={dashboardData.popularCourses} />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Weather Widget */}
          <WeatherWidget />
          
          {/* System Health */}
          <SystemHealthWidget health={dashboardData.systemHealth} />
          
          {/* Recent Bookings */}
          <RecentBookingsWidget bookings={dashboardData.recentBookings} />
          
          {/* Activity Timeline */}
          <ActivityTimeline activities={dashboardData.activities} />
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel
          notifications={dashboardData.notifications}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};
import React, { useState, useEffect, useCallback } from 'react';
import { TodayStats } from './TodayStats';
import { RecentBookingsList } from './RecentBookingsList';
import { QuickLinks } from './QuickLinks';
import { bookingApi } from '@/lib/api/bookingApi';
import type { Booking } from '@/types';

interface TodayBookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
}

export const DashboardContainer: React.FC = () => {
  const [stats, setStats] = useState<TodayBookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      // 오늘의 예약 통계 조회
      const [todayResponse, recentResponse] = await Promise.all([
        bookingApi.getBookings({ dateFrom: today, dateTo: today }, 1, 100),
        bookingApi.getBookings({}, 1, 5),
      ]);

      // 오늘의 예약 상태별 집계
      const todayBookings = todayResponse.data;
      const statsData: TodayBookingStats = {
        total: todayBookings.length,
        pending: todayBookings.filter((b) => b.status === 'PENDING').length,
        confirmed: todayBookings.filter((b) => b.status === 'CONFIRMED').length,
        completed: todayBookings.filter((b) => b.status === 'COMPLETED').length,
      };

      setStats(statsData);
      setRecentBookings(recentResponse.data);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="새로고침"
        >
          <svg
            className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Today's Stats */}
      <TodayStats
        total={stats.total}
        pending={stats.pending}
        confirmed={stats.confirmed}
        completed={stats.completed}
        isLoading={isLoading}
      />

      {/* Recent Bookings */}
      <RecentBookingsList bookings={recentBookings} isLoading={isLoading} />

      {/* Quick Links */}
      <QuickLinks />
    </div>
  );
};

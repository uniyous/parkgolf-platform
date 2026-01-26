import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { TodayStats } from './TodayStats';
import { RecentBookingsList } from './RecentBookingsList';
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
          <h1 className="text-2xl font-bold text-white">대시보드</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
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
          className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card bg-red-500/20 border-red-500/30 text-red-300 px-4 py-3">
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
    </div>
  );
};

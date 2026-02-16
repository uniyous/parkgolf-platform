import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { KpiCards } from './KpiCards';
import { WeeklyTrendChart } from './WeeklyTrendChart';
import { BookingStatusChart } from './BookingStatusChart';
import { RecentBookingsList } from './RecentBookingsList';
import {
  useDashboardOverviewQuery,
  useRealTimeStatsQuery,
  useTrendAnalyticsQuery,
  useBookingsQuery,
  dashboardKeys,
} from '@/hooks/queries';

export const DashboardContainer: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading } = useDashboardOverviewQuery();
  const { data: realTime, isLoading: realTimeLoading } = useRealTimeStatsQuery();
  const { data: trendData, isLoading: trendLoading } = useTrendAnalyticsQuery('7d');

  const today = new Date().toISOString().split('T')[0];
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsQuery(
    { dateFrom: today, dateTo: today },
    1,
    5,
  );

  const isRefreshing = overviewLoading || realTimeLoading || trendLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl shadow rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">대시보드</h2>
            <p className="mt-1 text-sm text-white/50">
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
            disabled={isRefreshing}
            className="p-2 text-white/50 hover:text-white/70 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards
        realTime={realTime}
        overview={overview}
        isLoading={overviewLoading && realTimeLoading}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <WeeklyTrendChart trendData={trendData} isLoading={trendLoading} />
        </div>
        <div className="lg:col-span-2">
          <BookingStatusChart overview={overview} isLoading={overviewLoading} />
        </div>
      </div>

      {/* Today's Bookings */}
      <RecentBookingsList
        bookings={bookingsData?.data ?? []}
        isLoading={bookingsLoading}
      />
    </>
  );
};

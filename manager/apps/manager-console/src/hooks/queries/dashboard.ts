import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboardApi';
import { dashboardKeys } from './keys';

export const useDashboardOverviewQuery = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: dashboardKeys.overview(startDate, endDate),
    queryFn: () => dashboardApi.getDashboardOverview(startDate, endDate),
    meta: { globalLoading: false, silent: true },
  });
};

export const useRealTimeStatsQuery = () => {
  return useQuery({
    queryKey: dashboardKeys.realTime(),
    queryFn: () => dashboardApi.getRealTimeStats(),
    refetchInterval: 30_000,
    meta: { globalLoading: false, silent: true },
  });
};

export const useTrendAnalyticsQuery = (period: '7d' | '30d' | '90d' | '1y' = '7d') => {
  return useQuery({
    queryKey: dashboardKeys.trends(period),
    queryFn: () => dashboardApi.getTrendAnalytics(period),
    meta: { globalLoading: false, silent: true },
  });
};

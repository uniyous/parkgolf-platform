import React from 'react';
import { CalendarCheck, Banknote, BarChart3, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { RealTimeStats, DashboardOverview } from '@/lib/api/dashboardApi';

interface KpiCardsProps {
  realTime?: RealTimeStats;
  overview?: DashboardOverview;
  isLoading?: boolean;
}

interface KpiItem {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}백만`;
  }
  return value.toLocaleString('ko-KR') + '원';
};

const formatPercent = (value: number): string => {
  return `${Math.round(value)}%`;
};

const formatChange = (value: number, suffix = ''): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
};

export const KpiCards: React.FC<KpiCardsProps> = ({ realTime, overview, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg p-5 animate-pulse">
            <div className="h-4 w-20 bg-white/15 rounded mb-3" />
            <div className="h-8 w-24 bg-white/15 rounded mb-2" />
            <div className="h-3 w-16 bg-white/15 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const todayBookings = realTime?.today?.bookings?.count ?? 0;
  const todayRevenue = realTime?.today?.revenue?.total ?? 0;
  const revenueGrowth = realTime?.today?.revenue?.growth ?? 0;
  const utilizationRate = overview?.courses?.courseUtilizationRate ?? 0;
  const cancelledBookings = overview?.bookings?.cancelledBookings ?? 0;
  const totalBookings = overview?.bookings?.totalBookings ?? 1;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;
  const bookingGrowthRate = overview?.bookings?.bookingGrowthRate ?? 0;

  const kpis: KpiItem[] = [
    {
      label: '오늘 예약',
      value: `${todayBookings}건`,
      change: formatChange(bookingGrowthRate, '%') + ' 전일比',
      trend: bookingGrowthRate >= 0 ? 'up' : 'down',
      icon: CalendarCheck,
      color: 'blue',
    },
    {
      label: '오늘 매출',
      value: formatCurrency(todayRevenue),
      change: formatChange(revenueGrowth, '%'),
      trend: revenueGrowth >= 0 ? 'up' : 'down',
      icon: Banknote,
      color: 'emerald',
    },
    {
      label: '이용률',
      value: formatPercent(utilizationRate),
      change: formatChange(utilizationRate > 70 ? 3 : -2, '%'),
      trend: utilizationRate > 70 ? 'up' : 'down',
      icon: BarChart3,
      color: 'violet',
    },
    {
      label: '취소율',
      value: formatPercent(cancellationRate),
      change: formatChange(cancellationRate > 5 ? 1 : -1, '%'),
      trend: cancellationRate <= 5 ? 'up' : 'down',
      icon: XCircle,
      color: 'rose',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-400/70' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-400/70' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: 'text-violet-400/70' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: 'text-rose-400/70' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const colors = colorMap[kpi.color];
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
        const trendColor = kpi.color === 'rose'
          ? (kpi.trend === 'up' ? 'text-emerald-400' : 'text-rose-400')
          : (kpi.trend === 'up' ? 'text-emerald-400' : 'text-rose-400');

        return (
          <div
            key={kpi.label}
            className={`${colors.bg} backdrop-blur-xl border border-white/15 rounded-lg p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/60">{kpi.label}</span>
              <Icon className={`w-5 h-5 ${colors.icon}`} />
            </div>
            <div className={`text-2xl font-bold ${colors.text} mb-1`}>{kpi.value}</div>
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{kpi.change}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

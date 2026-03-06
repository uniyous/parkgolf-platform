import React from 'react';
import type { RevenueStats } from '@/types';

interface PaymentStatsCardsProps {
  stats: RevenueStats | undefined;
  isLoading: boolean;
}

const formatCurrency = (value: number) => `₩${value.toLocaleString()}`;

const formatPercent = (value: number | undefined) => {
  if (value === undefined || value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const STATS_CONFIG = [
  {
    key: 'totalRevenue' as const,
    label: '총 매출',
    icon: '💰',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    format: formatCurrency,
  },
  {
    key: 'revenueGrowthRate' as const,
    label: '매출 성장률',
    icon: '📈',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    format: formatPercent,
  },
  {
    key: 'averageRevenuePerBooking' as const,
    label: '건당 평균 매출',
    icon: '📊',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    format: formatCurrency,
  },
  {
    key: 'refundTotal' as const,
    label: '환불 총액',
    icon: '💸',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    format: formatCurrency,
  },
];

export const PaymentStatsCards: React.FC<PaymentStatsCardsProps> = ({ stats, isLoading }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STATS_CONFIG.map((config) => {
        const value = stats?.[config.key] ?? 0;
        return (
          <div
            key={config.key}
            className={`p-4 rounded-lg ${config.bgColor} bg-white/10 backdrop-blur-xl border border-white/15`}
          >
            <div className="flex items-center justify-between">
              <div>
                {isLoading ? (
                  <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                ) : (
                  <div className={`text-2xl font-bold ${config.textColor}`}>
                    {config.format(value)}
                  </div>
                )}
                <div className="text-sm text-white/60 mt-1">{config.label}</div>
              </div>
              <div className="text-2xl">{config.icon}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

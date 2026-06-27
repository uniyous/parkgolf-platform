import React from 'react';
import { cn } from '@/utils';

type BookingStatusKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface BookingStatsCardsProps {
  statusCounts: Record<string, number>;
  statusFilter: BookingStatusKey;
  onStatusFilterChange: (status: BookingStatusKey) => void;
  todayCount?: number;
}

const STATS_CONFIG: Array<{
  key: BookingStatusKey;
  label: string;
  bgColor: string;
  textColor: string;
  icon: string;
}> = [
  {
    key: 'ALL',
    label: '전체 예약',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    icon: '📋',
  },
  {
    key: 'PENDING',
    label: '대기',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    icon: '⏳',
  },
  {
    key: 'CONFIRMED',
    label: '확정',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    icon: '✅',
  },
  {
    key: 'COMPLETED',
    label: '완료',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    icon: '🎉',
  },
  {
    key: 'CANCELLED',
    label: '취소',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    icon: '❌',
  },
  {
    key: 'NO_SHOW',
    label: '노쇼',
    bgColor: 'bg-white/10',
    textColor: 'text-white/60',
    icon: '🚫',
  },
];

export const BookingStatsCards: React.FC<BookingStatsCardsProps> = ({
  statusCounts,
  statusFilter,
  onStatusFilterChange,
  todayCount = 0,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-xl shadow rounded-lg border border-white/15 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">예약 현황</h2>
          <p className="mt-1 text-sm text-white/50">
            상태별 예약 현황을 확인하세요
          </p>
        </div>
        {todayCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
            오늘 예약 {todayCount}건
          </span>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STATS_CONFIG.map((config) => {
          const isActive = statusFilter === config.key;
          const count = statusCounts[config.key] || 0;

          return (
            <div
              key={config.key}
              onClick={() => onStatusFilterChange(config.key)}
              className={cn(
                'p-4 rounded-lg cursor-pointer transition-all',
                config.bgColor,
                isActive ? 'ring-2 ring-offset-1 ring-emerald-500 ring-offset-transparent' : 'hover:shadow-md'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-2xl font-bold', config.textColor)}>
                    {count}
                  </div>
                  <div className={cn('text-sm', config.textColor)}>
                    {config.label}
                  </div>
                </div>
                <div className="text-2xl">{config.icon}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

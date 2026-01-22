import React from 'react';
import { cn } from '@/utils';

interface CancellationStatsCardsProps {
  stats: {
    total: number;
    pendingRefund: number;
    completedRefund: number;
    noRefund: number;
    totalRefundAmount: number;
  };
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

const STATS_CONFIG = [
  {
    key: 'ALL',
    label: '전체 취소',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: '📋',
  },
  {
    key: 'PENDING',
    label: '환불 대기',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    icon: '⏳',
  },
  {
    key: 'COMPLETED',
    label: '환불 완료',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    icon: '✅',
  },
  {
    key: 'NO_REFUND',
    label: '환불 없음',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    icon: '🚫',
  },
];

export const CancellationStatsCards: React.FC<CancellationStatsCardsProps> = ({
  stats,
  selectedFilter,
  onFilterChange,
}) => {
  const getStatValue = (key: string) => {
    switch (key) {
      case 'ALL':
        return stats.total;
      case 'PENDING':
        return stats.pendingRefund;
      case 'COMPLETED':
        return stats.completedRefund;
      case 'NO_REFUND':
        return stats.noRefund;
      default:
        return 0;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">취소/환불 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            취소 내역 및 환불 현황을 관리하세요
          </p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-lg">
          <div className="text-sm text-indigo-600">총 환불 금액</div>
          <div className="text-xl font-bold text-indigo-700">
            ₩{stats.totalRefundAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS_CONFIG.map((config) => {
          const isActive = selectedFilter === config.key;
          const value = getStatValue(config.key);

          return (
            <div
              key={config.key}
              onClick={() => onFilterChange(config.key)}
              className={cn(
                'p-4 rounded-lg cursor-pointer transition-all',
                config.bgColor,
                isActive ? 'ring-2 ring-offset-1 ring-blue-500' : 'hover:shadow-md'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-2xl font-bold', config.textColor)}>
                    {value}
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

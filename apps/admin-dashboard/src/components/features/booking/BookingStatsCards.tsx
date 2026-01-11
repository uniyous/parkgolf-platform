import React from 'react';

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
  bgColorActive: string;
  textColor: string;
  borderColor: string;
}> = [
  {
    key: 'ALL',
    label: '전체',
    bgColor: 'bg-gray-50',
    bgColorActive: 'bg-blue-50 border-2 border-blue-500',
    textColor: 'text-gray-900',
    borderColor: 'hover:bg-gray-100',
  },
  {
    key: 'PENDING',
    label: '대기',
    bgColor: 'bg-yellow-50/50',
    bgColorActive: 'bg-yellow-50 border-2 border-yellow-500',
    textColor: 'text-yellow-700',
    borderColor: 'hover:bg-yellow-100',
  },
  {
    key: 'CONFIRMED',
    label: '확정',
    bgColor: 'bg-blue-50/50',
    bgColorActive: 'bg-blue-50 border-2 border-blue-500',
    textColor: 'text-blue-700',
    borderColor: 'hover:bg-blue-100',
  },
  {
    key: 'COMPLETED',
    label: '완료',
    bgColor: 'bg-green-50/50',
    bgColorActive: 'bg-green-50 border-2 border-green-500',
    textColor: 'text-green-700',
    borderColor: 'hover:bg-green-100',
  },
  {
    key: 'CANCELLED',
    label: '취소',
    bgColor: 'bg-red-50/50',
    bgColorActive: 'bg-red-50 border-2 border-red-500',
    textColor: 'text-red-700',
    borderColor: 'hover:bg-red-100',
  },
  {
    key: 'NO_SHOW',
    label: '노쇼',
    bgColor: 'bg-gray-50/50',
    bgColorActive: 'bg-gray-100 border-2 border-gray-500',
    textColor: 'text-gray-700',
    borderColor: 'hover:bg-gray-100',
  },
];

export const BookingStatsCards: React.FC<BookingStatsCardsProps> = ({
  statusCounts,
  statusFilter,
  onStatusFilterChange,
  todayCount = 0,
}) => {
  return (
    <div className="space-y-4">
      {/* 오늘 예약 배지 */}
      {todayCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
            오늘 예약 {todayCount}건
          </span>
        </div>
      )}

      {/* 상태별 카드 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {STATS_CONFIG.map((config) => {
          const isActive = statusFilter === config.key;
          const count = statusCounts[config.key] || 0;

          return (
            <div
              key={config.key}
              onClick={() => onStatusFilterChange(config.key)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                isActive ? config.bgColorActive : `${config.bgColor} ${config.borderColor}`
              }`}
            >
              <p className={`text-sm ${config.key === 'ALL' ? 'text-gray-500' : config.textColor.replace('700', '600')}`}>
                {config.label}
              </p>
              <p className={`text-2xl font-bold ${config.textColor}`}>
                {count}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

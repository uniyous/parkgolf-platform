import React from 'react';

interface TodayStatsProps {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  isLoading?: boolean;
}

export const TodayStats: React.FC<TodayStatsProps> = ({
  total,
  pending,
  confirmed,
  completed,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-blue-600">{total}</div>
            <div className="text-sm text-blue-600">전체 예약</div>
          </div>
          <div className="text-3xl">📅</div>
        </div>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-yellow-600">{pending}</div>
            <div className="text-sm text-yellow-600">대기 중</div>
          </div>
          <div className="text-3xl">⏳</div>
        </div>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-green-600">{confirmed}</div>
            <div className="text-sm text-green-600">확정</div>
          </div>
          <div className="text-3xl">✅</div>
        </div>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-purple-600">{completed}</div>
            <div className="text-sm text-purple-600">완료</div>
          </div>
          <div className="text-3xl">🏁</div>
        </div>
      </div>
    </div>
  );
};

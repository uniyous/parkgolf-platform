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
          <div key={i} className="bg-white/5 p-4 rounded-lg animate-pulse">
            <div className="h-8 w-16 bg-white/15 rounded mb-2" />
            <div className="h-4 w-20 bg-white/15 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-emerald-500/10 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-emerald-400">{total}</div>
            <div className="text-sm text-emerald-400">전체 예약</div>
          </div>
          <div className="text-3xl">📅</div>
        </div>
      </div>
      <div className="bg-yellow-500/10 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-yellow-400">{pending}</div>
            <div className="text-sm text-yellow-400">대기 중</div>
          </div>
          <div className="text-3xl">⏳</div>
        </div>
      </div>
      <div className="bg-green-500/10 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-green-400">{confirmed}</div>
            <div className="text-sm text-green-400">확정</div>
          </div>
          <div className="text-3xl">✅</div>
        </div>
      </div>
      <div className="bg-purple-500/10 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-purple-400">{completed}</div>
            <div className="text-sm text-purple-400">완료</div>
          </div>
          <div className="text-3xl">🏁</div>
        </div>
      </div>
    </div>
  );
};

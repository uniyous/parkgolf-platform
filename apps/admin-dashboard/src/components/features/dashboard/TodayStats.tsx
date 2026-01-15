import React from 'react';

interface TodayStatsProps {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  isLoading?: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  bgColor: string;
  textColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-lg p-4`}>
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`text-2xl font-bold ${textColor} mt-1`}>{value}건</p>
  </div>
);

export const TodayStats: React.FC<TodayStatsProps> = ({
  total,
  pending,
  confirmed,
  completed,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘의 예약</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘의 예약</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="전체"
          value={total}
          bgColor="bg-gray-50"
          textColor="text-gray-900"
        />
        <StatCard
          label="대기"
          value={pending}
          bgColor="bg-yellow-50"
          textColor="text-yellow-700"
        />
        <StatCard
          label="확정"
          value={confirmed}
          bgColor="bg-green-50"
          textColor="text-green-700"
        />
        <StatCard
          label="완료"
          value={completed}
          bgColor="bg-blue-50"
          textColor="text-blue-700"
        />
      </div>
    </div>
  );
};

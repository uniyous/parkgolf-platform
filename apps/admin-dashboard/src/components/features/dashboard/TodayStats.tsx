import React from 'react';
import { Calendar, Clock, CheckCircle, ListTodo } from 'lucide-react';
import { StatsCard } from '@/components/ui';

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
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="전체 예약"
        value={`${total}건`}
        icon={Calendar}
        variant="default"
        isLoading={isLoading}
      />
      <StatsCard
        title="대기 중"
        value={`${pending}건`}
        icon={Clock}
        variant="warning"
        isLoading={isLoading}
      />
      <StatsCard
        title="확정"
        value={`${confirmed}건`}
        icon={CheckCircle}
        variant="success"
        isLoading={isLoading}
      />
      <StatsCard
        title="완료"
        value={`${completed}건`}
        icon={ListTodo}
        variant="primary"
        isLoading={isLoading}
      />
    </div>
  );
};

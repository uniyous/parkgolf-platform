import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardOverview } from '@/lib/api/dashboardApi';

interface BookingStatusChartProps {
  overview?: DashboardOverview;
  isLoading?: boolean;
}

interface StatusItem {
  name: string;
  value: number;
  color: string;
  dotClass: string;
}

export const BookingStatusChart: React.FC<BookingStatusChartProps> = ({ overview, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg p-6">
        <div className="h-5 w-32 bg-white/15 rounded mb-6" />
        <div className="h-[280px] bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  const bookings = overview?.bookings;
  const total = bookings?.totalBookings ?? 0;
  const confirmed = bookings?.confirmedBookings ?? 0;
  const cancelled = bookings?.cancelledBookings ?? 0;
  const pending = Math.max(0, total - confirmed - cancelled);
  const completed = Math.max(0, confirmed - Math.floor(confirmed * 0.3));
  const confirmedActive = confirmed - completed;

  const data: StatusItem[] = [
    { name: '대기', value: pending, color: '#facc15', dotClass: 'bg-yellow-400' },
    { name: '확정', value: confirmedActive, color: '#60a5fa', dotClass: 'bg-blue-400' },
    { name: '완료', value: completed, color: '#34d399', dotClass: 'bg-emerald-400' },
    { name: '취소', value: cancelled, color: '#f87171', dotClass: 'bg-red-400' },
  ].filter((item) => item.value > 0);

  const totalCount = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg p-6">
      <h3 className="text-base font-medium text-white mb-4">예약 현황 분포</h3>
      {totalCount === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-white/40 text-sm">
          데이터가 없습니다
        </div>
      ) : (
        <div className="flex items-center gap-6 h-[280px]">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 13,
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}건`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 min-w-[100px]">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                <span className="text-sm text-white/70">{item.name}</span>
                <span className="text-sm font-medium text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { TrendData } from '@/lib/api/dashboardApi';

interface WeeklyTrendChartProps {
  trendData?: TrendData;
  isLoading?: boolean;
}

interface ChartDataItem {
  date: string;
  label: string;
  bookings: number;
  revenue: number;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatRevenue = (value: number): string => {
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(0)}만`;
  }
  return value.toLocaleString();
};

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ trendData, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg p-6">
        <div className="h-5 w-40 bg-white/15 rounded mb-6" />
        <div className="h-[280px] bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  const bookings = trendData?.trends?.bookings ?? [];
  const revenues = trendData?.trends?.revenue ?? [];

  const revenueMap = new Map(revenues.map((r) => [r.date, r.amount]));

  const chartData: ChartDataItem[] = bookings.map((b) => ({
    date: b.date,
    label: formatDate(b.date),
    bookings: b.count,
    revenue: revenueMap.get(b.date) ?? 0,
  }));

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg p-6">
      <h3 className="text-base font-medium text-white mb-4">주간 예약·매출 추이</h3>
      {chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-white/40 text-sm">
          데이터가 없습니다
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="bookings"
              orientation="left"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tickFormatter={formatRevenue}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: 13,
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                const v = value ?? 0;
                if (name === '매출') return [v.toLocaleString() + '원', name];
                return [v + '건', name];
              }}
              labelFormatter={(label) => String(label)}
            />
            <Legend
              wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            />
            <Area
              yAxisId="bookings"
              type="monotone"
              dataKey="bookings"
              name="예약건수"
              stroke="#60a5fa"
              fill="rgba(96,165,250,0.15)"
              strokeWidth={2}
              dot={{ r: 3, fill: '#60a5fa' }}
              activeDot={{ r: 5 }}
            />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              name="매출"
              fill="rgba(52,211,153,0.5)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

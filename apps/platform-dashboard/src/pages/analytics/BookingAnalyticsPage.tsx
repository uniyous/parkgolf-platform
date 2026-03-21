import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, CircleCheck, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { FilterContainer, FilterSelect, FilterResetButton } from '@/components/common/filters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ===== Mock Data =====

const KPI_DATA = [
  {
    label: '총 예약',
    value: '3,247',
    change: '+14.2%',
    trend: 'up' as const,
    icon: CalendarDays,
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    label: '확정',
    value: '2,180',
    change: '+10.5%',
    trend: 'up' as const,
    icon: CheckCircle2,
    color: 'bg-sky-500/20 text-sky-400',
  },
  {
    label: '완료',
    value: '1,842',
    change: '+18.3%',
    trend: 'up' as const,
    icon: CircleCheck,
    color: 'bg-violet-500/20 text-violet-400',
  },
  {
    label: '취소/환불',
    value: '287',
    change: '-5.1%',
    trend: 'down' as const,
    icon: XCircle,
    color: 'bg-red-500/20 text-red-400',
  },
];

const DAILY_BOOKING_DATA = [
  { date: '01일', 예약: 95, 확정: 78, 완료: 65, 취소: 8 },
  { date: '02일', 예약: 112, 확정: 92, 완료: 80, 취소: 12 },
  { date: '03일', 예약: 88, 확정: 72, 완료: 60, 취소: 6 },
  { date: '04일', 예약: 130, 확정: 108, 완료: 95, 취소: 10 },
  { date: '05일', 예약: 145, 확정: 120, 완료: 105, 취소: 14 },
  { date: '06일', 예약: 160, 확정: 138, 완료: 120, 취소: 9 },
  { date: '07일', 예약: 155, 확정: 132, 완료: 115, 취소: 11 },
  { date: '08일', 예약: 102, 확정: 85, 완료: 72, 취소: 7 },
  { date: '09일', 예약: 118, 확정: 98, 완료: 85, 취소: 10 },
  { date: '10일', 예약: 135, 확정: 112, 완료: 98, 취소: 12 },
  { date: '11일', 예약: 142, 확정: 118, 완료: 102, 취소: 8 },
  { date: '12일', 예약: 128, 확정: 105, 완료: 90, 취소: 11 },
  { date: '13일', 예약: 165, 확정: 142, 완료: 125, 취소: 13 },
  { date: '14일', 예약: 170, 확정: 148, 완료: 132, 취소: 10 },
];

const CustomTooltipStyle = {
  backgroundColor: 'rgba(6, 78, 59, 0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
};

// ===== Component =====

export const BookingAnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState({ from: '2025-01-01', to: '2025-01-14' });
  const [selectedCompany, setSelectedCompany] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">예약 현황</h1>
        <p className="mt-1 text-sm text-white/50">예약 통계 및 트렌드 분석</p>
      </div>

      {/* Filters */}
      <FilterContainer columns={3}>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-white/50 mb-1.5">기간</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            />
            <span className="text-white/30 shrink-0">~</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>
        <FilterSelect
          label="가맹점"
          value={selectedCompany}
          onChange={setSelectedCompany}
          options={[
            { value: '1', label: '강남 파크골프장' },
            { value: '2', label: '서초 그린파크' },
            { value: '3', label: '분당 레이크CC' },
          ]}
          placeholder="전체 가맹점"
        />
        <div className="flex items-end justify-end">
          <FilterResetButton
            hasActiveFilters={!!(selectedCompany || dateRange.from !== '2025-01-01' || dateRange.to !== '2025-01-14')}
            onClick={() => {
              setDateRange({ from: '2025-01-01', to: '2025-01-14' });
              setSelectedCompany('');
            }}
          />
        </div>
      </FilterContainer>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} variant="default" className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {kpi.trend === 'up' ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        kpi.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Daily Booking Trend */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>일별 예약 추이</CardTitle>
          <p className="text-xs text-white/40">
            {dateRange.from} ~ {dateRange.to}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DAILY_BOOKING_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                <Line
                  type="monotone"
                  dataKey="예약"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10B981' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="확정"
                  stroke="#34D399"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#34D399' }}
                />
                <Line
                  type="monotone"
                  dataKey="완료"
                  stroke="#059669"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#059669' }}
                />
                <Line
                  type="monotone"
                  dataKey="취소"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: '#EF4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

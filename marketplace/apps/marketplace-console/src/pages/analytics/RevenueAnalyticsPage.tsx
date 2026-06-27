import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';

// ===== Mock Data =====

const KPI_DATA = [
  {
    label: '총 매출',
    value: '2억 4,580만',
    change: '+18.7%',
    trend: 'up' as const,
    icon: DollarSign,
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    label: '이번 달',
    value: '3,420만',
    change: '+22.1%',
    trend: 'up' as const,
    icon: ArrowUpRight,
    color: 'bg-sky-500/20 text-sky-400',
  },
  {
    label: '전월 대비',
    value: '+620만',
    change: '+22.1%',
    trend: 'up' as const,
    icon: TrendingUp,
    color: 'bg-violet-500/20 text-violet-400',
  },
  {
    label: '환불 금액',
    value: '480만',
    change: '-8.3%',
    trend: 'down' as const,
    icon: RotateCcw,
    color: 'bg-red-500/20 text-red-400',
  },
];

const MONTHLY_REVENUE_DATA = [
  { month: '1월', 매출: 1850, 환불: 120, 순매출: 1730 },
  { month: '2월', 매출: 1920, 환불: 95, 순매출: 1825 },
  { month: '3월', 매출: 2350, 환불: 180, 순매출: 2170 },
  { month: '4월', 매출: 2800, 환불: 210, 순매출: 2590 },
  { month: '5월', 매출: 3100, 환불: 150, 순매출: 2950 },
  { month: '6월', 매출: 2780, 환불: 130, 순매출: 2650 },
  { month: '7월', 매출: 2450, 환불: 165, 순매출: 2285 },
  { month: '8월', 매출: 2200, 환불: 140, 순매출: 2060 },
  { month: '9월', 매출: 2680, 환불: 110, 순매출: 2570 },
  { month: '10월', 매출: 3050, 환불: 175, 순매출: 2875 },
  { month: '11월', 매출: 2100, 환불: 90, 순매출: 2010 },
  { month: '12월', 매출: 1700, 환불: 85, 순매출: 1615 },
];

const CustomTooltipStyle = {
  backgroundColor: 'rgba(6, 78, 59, 0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
};

// ===== Component =====

export const RevenueAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">매출 현황</h1>
        <p className="mt-1 text-sm text-white/50">매출 통계 및 추이 분석</p>
      </div>

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

      {/* Monthly Revenue Chart (Bar + Line combo) */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>월별 매출 추이</CardTitle>
          <p className="text-xs text-white/40">매출, 환불, 순매출 (단위: 만원)</p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={MONTHLY_REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                <Bar
                  dataKey="매출"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Bar
                  dataKey="환불"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  opacity={0.6}
                />
                <Line
                  type="monotone"
                  dataKey="순매출"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#34D399' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

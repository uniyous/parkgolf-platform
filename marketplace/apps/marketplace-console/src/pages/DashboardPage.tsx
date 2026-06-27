import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, Building2, Users, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
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
    label: '전체 예약',
    value: '12,847',
    change: '+12.5%',
    trend: 'up' as const,
    icon: ClipboardList,
    color: 'emerald',
  },
  {
    label: '오늘 예약',
    value: '284',
    change: '+8.3%',
    trend: 'up' as const,
    icon: Calendar,
    color: 'sky',
  },
  {
    label: '활성 가맹점',
    value: '42',
    change: '+2.4%',
    trend: 'up' as const,
    icon: Building2,
    color: 'violet',
  },
  {
    label: '전체 회원',
    value: '8,932',
    change: '-1.2%',
    trend: 'down' as const,
    icon: Users,
    color: 'amber',
  },
];

const MONTHLY_BOOKING_TREND = [
  { month: '1월', 올해: 980, 작년: 820 },
  { month: '2월', 올해: 1050, 작년: 900 },
  { month: '3월', 올해: 1320, 작년: 1100 },
  { month: '4월', 올해: 1580, 작년: 1350 },
  { month: '5월', 올해: 1820, 작년: 1600 },
  { month: '6월', 올해: 1650, 작년: 1480 },
  { month: '7월', 올해: 1430, 작년: 1200 },
  { month: '8월', 올해: 1280, 작년: 1050 },
  { month: '9월', 올해: 1560, 작년: 1380 },
  { month: '10월', 올해: 1780, 작년: 1520 },
  { month: '11월', 올해: 1200, 작년: 980 },
  { month: '12월', 올해: 890, 작년: 750 },
];

const BOOKING_STATUS_DATA = [
  { name: 'CONFIRMED', label: '확정', value: 4820, color: '#10B981' },
  { name: 'COMPLETED', label: '완료', value: 5640, color: '#34D399' },
  { name: 'PENDING', label: '대기', value: 1580, color: '#FBBF24' },
  { name: 'CANCELLED', label: '취소', value: 807, color: '#EF4444' },
];

const TOP_COMPANIES = [
  { name: '강남 파크골프장', bookings: 2340 },
  { name: '서초 그린파크', bookings: 1890 },
  { name: '분당 레이크CC', bookings: 1650 },
  { name: '일산 힐파크', bookings: 1420 },
  { name: '수원 밸리GC', bookings: 1180 },
];

const HEATMAP_DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const HEATMAP_HOURS = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
const HEATMAP_DATA: number[][] = [
  [2, 5, 8, 9, 7, 6, 4, 3, 5, 7, 4, 2],
  [3, 6, 9, 10, 8, 5, 3, 4, 6, 8, 5, 3],
  [2, 4, 7, 8, 6, 5, 3, 3, 5, 6, 4, 2],
  [3, 5, 8, 9, 7, 6, 4, 4, 6, 7, 5, 3],
  [4, 7, 10, 10, 9, 7, 5, 5, 7, 9, 6, 4],
  [6, 9, 10, 10, 10, 9, 8, 7, 9, 10, 8, 5],
  [5, 8, 10, 10, 9, 8, 7, 6, 8, 9, 7, 4],
];

const MEMBER_SIGNUP_TREND = [
  { month: '1월', 가입자: 320, 탈퇴자: 45 },
  { month: '2월', 가입자: 380, 탈퇴자: 52 },
  { month: '3월', 가입자: 520, 탈퇴자: 38 },
  { month: '4월', 가입자: 680, 탈퇴자: 42 },
  { month: '5월', 가입자: 750, 탈퇴자: 55 },
  { month: '6월', 가입자: 620, 탈퇴자: 48 },
  { month: '7월', 가입자: 540, 탈퇴자: 60 },
  { month: '8월', 가입자: 480, 탈퇴자: 65 },
  { month: '9월', 가입자: 590, 탈퇴자: 40 },
  { month: '10월', 가입자: 710, 탈퇴자: 35 },
  { month: '11월', 가입자: 460, 탈퇴자: 50 },
  { month: '12월', 가입자: 380, 탈퇴자: 42 },
];

const COMPANY_STATUS_TABLE = [
  { name: '강남 파크골프장', status: '운영 중', clubs: 3, bookings: 2340, change: '+15.2%' },
  { name: '서초 그린파크', status: '운영 중', clubs: 2, bookings: 1890, change: '+8.7%' },
  { name: '분당 레이크CC', status: '운영 중', clubs: 4, bookings: 1650, change: '+5.1%' },
  { name: '일산 힐파크', status: '점검 중', clubs: 2, bookings: 1420, change: '-3.2%' },
  { name: '수원 밸리GC', status: '운영 중', clubs: 3, bookings: 1180, change: '+22.4%' },
  { name: '인천 씨사이드', status: '운영 중', clubs: 1, bookings: 980, change: '+11.8%' },
];

// ===== Helper =====

const getHeatmapColor = (value: number): string => {
  if (value <= 2) return 'bg-emerald-900/30';
  if (value <= 4) return 'bg-emerald-700/40';
  if (value <= 6) return 'bg-emerald-600/50';
  if (value <= 8) return 'bg-emerald-500/60';
  return 'bg-emerald-400/80';
};

const getKpiIconBg = (color: string): string => {
  switch (color) {
    case 'emerald': return 'bg-emerald-500/20 text-emerald-400';
    case 'sky': return 'bg-sky-500/20 text-sky-400';
    case 'violet': return 'bg-violet-500/20 text-violet-400';
    case 'amber': return 'bg-amber-500/20 text-amber-400';
    default: return 'bg-white/10 text-white/60';
  }
};

const CustomTooltipStyle = {
  backgroundColor: 'rgba(6, 78, 59, 0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
};

// ===== Component =====

export const DashboardPage: React.FC = () => {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">플랫폼 현황</h1>
          <p className="mt-1 text-sm text-white/50">{today}</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/15 hover:text-white">
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
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
                    <span className="text-xs text-white/40">전월 대비</span>
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 ${getKpiIconBg(kpi.color)}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Booking Trend + Status Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 예약 추이 (Line Chart) */}
        <Card variant="default" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>예약 추이</CardTitle>
            <p className="text-xs text-white/40">월별 예약 건수 (올해 vs 작년)</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY_BOOKING_TREND}>
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
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="올해"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="작년"
                    stroke="#6B7280"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={{ r: 2, fill: '#6B7280' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 예약 상태 분포 (Donut Chart) */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>예약 상태 분포</CardTitle>
            <p className="text-xs text-white/40">현재 예약 상태별 비율</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={BOOKING_STATUS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                  >
                    {BOOKING_STATUS_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CustomTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BOOKING_STATUS_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white/60">{item.label}</span>
                  <span className="ml-auto font-medium text-white/80">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Top Companies + Heatmap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 가맹점별 예약 랭킹 (Horizontal Bar Chart) */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>가맹점별 예약 랭킹</CardTitle>
            <p className="text-xs text-white/40">Top 5 가맹점</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TOP_COMPANIES} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    width={110}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip contentStyle={CustomTooltipStyle} />
                  <Bar dataKey="bookings" name="예약 건수" radius={[0, 4, 4, 0]}>
                    {TOP_COMPANIES.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#10B981' : index === 1 ? '#34D399' : '#059669'}
                        opacity={1 - index * 0.12}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 시간대별 예약 히트맵 */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>시간대별 예약 히트맵</CardTitle>
            <p className="text-xs text-white/40">요일 x 시간대 예약 밀집도</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {/* Column headers (hours) */}
              <div className="mb-1 flex">
                <div className="w-8 shrink-0" />
                {HEATMAP_HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-[10px] text-white/40"
                  >
                    {hour}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {HEATMAP_DAYS.map((day, dayIdx) => (
                <div key={day} className="mb-1 flex items-center">
                  <div className="w-8 shrink-0 text-xs text-white/50">{day}</div>
                  {HEATMAP_DATA[dayIdx].map((value, hourIdx) => (
                    <div
                      key={`${dayIdx}-${hourIdx}`}
                      className={`mx-0.5 flex-1 rounded ${getHeatmapColor(value)}`}
                      style={{ aspectRatio: '1' }}
                      title={`${day}요일 ${HEATMAP_HOURS[hourIdx]}시: ${value}건`}
                    />
                  ))}
                </div>
              ))}
              {/* Legend */}
              <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-white/40">
                <span>적음</span>
                <div className="h-3 w-3 rounded bg-emerald-900/30" />
                <div className="h-3 w-3 rounded bg-emerald-700/40" />
                <div className="h-3 w-3 rounded bg-emerald-600/50" />
                <div className="h-3 w-3 rounded bg-emerald-500/60" />
                <div className="h-3 w-3 rounded bg-emerald-400/80" />
                <span>많음</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Member Signup Trend */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>회원 가입 추이</CardTitle>
          <p className="text-xs text-white/40">월별 신규 가입자 및 탈퇴자</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MEMBER_SIGNUP_TREND}>
                <defs>
                  <linearGradient id="gradSignup" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradChurn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="가입자"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#gradSignup)"
                />
                <Area
                  type="monotone"
                  dataKey="탈퇴자"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  fill="url(#gradChurn)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Company Status Table */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>가맹점 현황</CardTitle>
          <p className="text-xs text-white/40">운영 현황 요약</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-semibold text-white/50">가맹점명</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50">상태</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/50">골프장 수</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/50">예약 건수</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/50">전월 대비</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {COMPANY_STATUS_TABLE.map((row) => (
                  <tr key={row.name} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white/80">{row.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === '운영 중'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/60">{row.clubs}</td>
                    <td className="px-4 py-3 text-right text-white/60">
                      {row.bookings.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-medium ${
                          row.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {row.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

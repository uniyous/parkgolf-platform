import React from 'react';
import { MapPin, Layers, Activity, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';

// ===== Mock Data =====

const KPI_DATA = [
  {
    label: '전체 골프장',
    value: '127',
    change: '+3.2%',
    trend: 'up' as const,
    icon: MapPin,
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    label: '전체 코스',
    value: '342',
    change: '+5.8%',
    trend: 'up' as const,
    icon: Layers,
    color: 'bg-sky-500/20 text-sky-400',
  },
  {
    label: '운영 중',
    value: '118',
    change: '+1.5%',
    trend: 'up' as const,
    icon: Activity,
    color: 'bg-violet-500/20 text-violet-400',
  },
  {
    label: '평균 이용률',
    value: '72.4%',
    change: '-2.1%',
    trend: 'down' as const,
    icon: BarChart3,
    color: 'bg-amber-500/20 text-amber-400',
  },
];

const MOCK_CLUBS = [
  {
    id: 1,
    name: '강남 파크골프 A코스',
    company: '강남 파크골프장',
    courses: 3,
    holes: 27,
    status: 'ACTIVE' as const,
    utilization: 85.2,
    avgRating: 4.5,
  },
  {
    id: 2,
    name: '서초 그린 메인',
    company: '서초 그린파크',
    courses: 2,
    holes: 18,
    status: 'ACTIVE' as const,
    utilization: 78.6,
    avgRating: 4.3,
  },
  {
    id: 3,
    name: '분당 레이크 챔피언',
    company: '분당 레이크CC',
    courses: 4,
    holes: 36,
    status: 'ACTIVE' as const,
    utilization: 92.1,
    avgRating: 4.7,
  },
  {
    id: 4,
    name: '일산 힐 비스타',
    company: '일산 힐파크',
    courses: 2,
    holes: 18,
    status: 'MAINTENANCE' as const,
    utilization: 0,
    avgRating: 4.1,
  },
  {
    id: 5,
    name: '수원 밸리 그린',
    company: '수원 밸리GC',
    courses: 3,
    holes: 27,
    status: 'ACTIVE' as const,
    utilization: 68.9,
    avgRating: 4.4,
  },
  {
    id: 6,
    name: '인천 씨사이드 오션',
    company: '인천 씨사이드',
    courses: 1,
    holes: 9,
    status: 'ACTIVE' as const,
    utilization: 55.3,
    avgRating: 4.0,
  },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '운영 중', className: 'bg-emerald-500/20 text-emerald-400' },
  MAINTENANCE: { label: '점검 중', className: 'bg-amber-500/20 text-amber-400' },
  CLOSED: { label: '폐쇄', className: 'bg-red-500/20 text-red-400' },
};

// ===== Component =====

export const ClubAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">골프장 현황</h1>
        <p className="mt-1 text-sm text-white/50">골프장/코스 운영 통계</p>
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

      {/* Club Table */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>골프장 목록</CardTitle>
          <p className="text-xs text-white/40">운영 현황 및 이용률</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>골프장명</TableHead>
                <TableHead>소속 가맹점</TableHead>
                <TableHead className="text-center">코스</TableHead>
                <TableHead className="text-center">홀</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right">이용률</TableHead>
                <TableHead className="text-right">평균 평점</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CLUBS.map((club) => {
                const statusInfo = STATUS_CONFIG[club.status] || STATUS_CONFIG.ACTIVE;
                return (
                  <TableRow key={club.id}>
                    <TableCell className="font-medium text-white">{club.name}</TableCell>
                    <TableCell>{club.company}</TableCell>
                    <TableCell className="text-center">{club.courses}</TableCell>
                    <TableCell className="text-center">{club.holes}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${club.utilization}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/60">{club.utilization}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-amber-400">{club.avgRating}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

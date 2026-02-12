import React from 'react';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { useActionPermissions } from '@/hooks';

// ===== Mock Data =====

const MOCK_COMPANIES = [
  {
    id: 1,
    name: '강남 파크골프장',
    representative: '김철수',
    phone: '02-1234-5678',
    clubs: 3,
    status: 'ACTIVE' as const,
    createdAt: '2024-03-15',
  },
  {
    id: 2,
    name: '서초 그린파크',
    representative: '이영희',
    phone: '02-2345-6789',
    clubs: 2,
    status: 'ACTIVE' as const,
    createdAt: '2024-05-20',
  },
  {
    id: 3,
    name: '분당 레이크CC',
    representative: '박지성',
    phone: '031-345-6789',
    clubs: 4,
    status: 'ACTIVE' as const,
    createdAt: '2024-01-10',
  },
  {
    id: 4,
    name: '일산 힐파크',
    representative: '최동욱',
    phone: '031-456-7890',
    clubs: 2,
    status: 'MAINTENANCE' as const,
    createdAt: '2024-07-22',
  },
  {
    id: 5,
    name: '수원 밸리GC',
    representative: '정수빈',
    phone: '031-567-8901',
    clubs: 3,
    status: 'ACTIVE' as const,
    createdAt: '2024-02-28',
  },
  {
    id: 6,
    name: '인천 씨사이드',
    representative: '강민수',
    phone: '032-678-9012',
    clubs: 1,
    status: 'INACTIVE' as const,
    createdAt: '2024-09-05',
  },
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '운영 중', className: 'bg-emerald-500/20 text-emerald-400' },
  INACTIVE: { label: '비활성', className: 'bg-white/10 text-white/50' },
  MAINTENANCE: { label: '점검 중', className: 'bg-amber-500/20 text-amber-400' },
  SUSPENDED: { label: '정지', className: 'bg-red-500/20 text-red-400' },
  PENDING: { label: '대기', className: 'bg-sky-500/20 text-sky-400' },
};

// ===== Component =====

export const CompaniesPage: React.FC = () => {
  const { canCreate } = useActionPermissions('COMPANIES');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">가맹점 관리</h1>
          <p className="mt-1 text-sm text-white/50">
            총 {MOCK_COMPANIES.length}개 가맹점
          </p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            가맹점 추가
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card variant="default" padding="sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="가맹점명, 대표자명으로 검색"
              className="h-10 w-full rounded-lg border border-white/15 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>가맹점명</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead className="text-center">골프장 수</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead>등록일</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_COMPANIES.map((company) => {
            const statusInfo = STATUS_LABELS[company.status] || STATUS_LABELS.ACTIVE;
            return (
              <TableRow key={company.id}>
                <TableCell className="font-medium text-white">{company.name}</TableCell>
                <TableCell>{company.representative}</TableCell>
                <TableCell>{company.phone}</TableCell>
                <TableCell className="text-center">{company.clubs}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </TableCell>
                <TableCell>{company.createdAt}</TableCell>
                <TableCell>
                  <button className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

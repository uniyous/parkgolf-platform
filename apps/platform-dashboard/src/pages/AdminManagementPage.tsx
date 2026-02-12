import React from 'react';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { useActionPermissions } from '@/hooks';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS } from '@/utils/admin-permissions';
import type { AdminRole } from '@/types';

// ===== Mock Data =====

const MOCK_ADMINS = [
  {
    id: 1,
    name: '김관리자',
    email: 'admin@parkgolf.com',
    role: 'PLATFORM_ADMIN' as AdminRole,
    company: '본사',
    status: 'ACTIVE' as const,
    lastLoginAt: '2025-01-15 14:32',
  },
  {
    id: 2,
    name: '이지원',
    email: 'support@parkgolf.com',
    role: 'PLATFORM_SUPPORT' as AdminRole,
    company: '본사',
    status: 'ACTIVE' as const,
    lastLoginAt: '2025-01-15 10:05',
  },
  {
    id: 3,
    name: '박조회',
    email: 'viewer@parkgolf.com',
    role: 'PLATFORM_VIEWER' as AdminRole,
    company: '본사',
    status: 'ACTIVE' as const,
    lastLoginAt: '2025-01-14 16:48',
  },
  {
    id: 4,
    name: '강남대표',
    email: 'admin@gangnam.com',
    role: 'COMPANY_ADMIN' as AdminRole,
    company: '강남 파크골프장',
    status: 'ACTIVE' as const,
    lastLoginAt: '2025-01-15 09:22',
  },
  {
    id: 5,
    name: '서초매니저',
    email: 'manager@seocho.com',
    role: 'COMPANY_MANAGER' as AdminRole,
    company: '서초 그린파크',
    status: 'ACTIVE' as const,
    lastLoginAt: '2025-01-13 11:15',
  },
  {
    id: 6,
    name: '분당직원',
    email: 'staff@bundang.com',
    role: 'COMPANY_STAFF' as AdminRole,
    company: '분당 레이크CC',
    status: 'INACTIVE' as const,
    lastLoginAt: '2024-12-28 08:40',
  },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '활성', className: 'bg-emerald-500/20 text-emerald-400' },
  INACTIVE: { label: '비활성', className: 'bg-white/10 text-white/50' },
};

// ===== Component =====

export const AdminManagementPage: React.FC = () => {
  const { canCreate } = useActionPermissions('ADMINS');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">관리자 관리</h1>
          <p className="mt-1 text-sm text-white/50">
            총 {MOCK_ADMINS.length}명의 관리자
          </p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            관리자 추가
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
              placeholder="이름, 이메일로 검색"
              className="h-10 w-full rounded-lg border border-white/15 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>소속</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead>최근 로그인</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_ADMINS.map((admin) => {
            const roleLabel = ADMIN_ROLE_LABELS[admin.role] || admin.role;
            const roleColor = ADMIN_ROLE_COLORS[admin.role] || 'bg-white/10 text-white/60';
            const statusInfo = STATUS_CONFIG[admin.status] || STATUS_CONFIG.ACTIVE;

            return (
              <TableRow key={admin.id}>
                <TableCell className="font-medium text-white">{admin.name}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColor}`}
                  >
                    {roleLabel}
                  </span>
                </TableCell>
                <TableCell>{admin.company}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </TableCell>
                <TableCell className="text-white/50">{admin.lastLoginAt}</TableCell>
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

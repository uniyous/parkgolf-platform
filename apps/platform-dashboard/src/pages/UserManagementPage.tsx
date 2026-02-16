import React from 'react';
import { Search, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';

// ===== Mock Data =====

const MOCK_USERS = [
  {
    id: 1,
    name: '홍길동',
    email: 'hong@example.com',
    createdAt: '2024-06-12',
    membership: 'PREMIUM' as const,
    status: 'ACTIVE' as const,
    bookings: 28,
  },
  {
    id: 2,
    name: '김민수',
    email: 'minsu@example.com',
    createdAt: '2024-08-03',
    membership: 'REGULAR' as const,
    status: 'ACTIVE' as const,
    bookings: 15,
  },
  {
    id: 3,
    name: '이수진',
    email: 'sujin@example.com',
    createdAt: '2024-03-22',
    membership: 'PREMIUM' as const,
    status: 'ACTIVE' as const,
    bookings: 42,
  },
  {
    id: 4,
    name: '박준혁',
    email: 'junhyuk@example.com',
    createdAt: '2024-11-15',
    membership: 'REGULAR' as const,
    status: 'INACTIVE' as const,
    bookings: 3,
  },
  {
    id: 5,
    name: '최예린',
    email: 'yerin@example.com',
    createdAt: '2024-07-08',
    membership: 'GOLD' as const,
    status: 'ACTIVE' as const,
    bookings: 56,
  },
  {
    id: 6,
    name: '정동현',
    email: 'donghyun@example.com',
    createdAt: '2024-09-25',
    membership: 'GUEST' as const,
    status: 'SUSPENDED' as const,
    bookings: 1,
  },
  {
    id: 7,
    name: '오서연',
    email: 'seoyeon@example.com',
    createdAt: '2024-05-14',
    membership: 'REGULAR' as const,
    status: 'ACTIVE' as const,
    bookings: 19,
  },
];

const MEMBERSHIP_CONFIG: Record<string, { label: string; className: string }> = {
  PREMIUM: { label: 'Premium', className: 'bg-purple-500/20 text-purple-400' },
  GOLD: { label: 'Gold', className: 'bg-amber-500/20 text-amber-400' },
  REGULAR: { label: 'Regular', className: 'bg-emerald-500/20 text-emerald-400' },
  GUEST: { label: 'Guest', className: 'bg-white/10 text-white/50' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '활성', className: 'bg-emerald-500/20 text-emerald-400' },
  INACTIVE: { label: '비활성', className: 'bg-white/10 text-white/50' },
  SUSPENDED: { label: '정지', className: 'bg-red-500/20 text-red-400' },
};

// ===== Component =====

export const UserManagementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">회원 관리</h1>
        <p className="mt-1 text-sm text-white/50">
          총 {MOCK_USERS.length}명의 회원
        </p>
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
            <TableHead>가입일</TableHead>
            <TableHead className="text-center">멤버십</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead className="text-right">예약 수</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_USERS.map((user) => {
            const membershipInfo = MEMBERSHIP_CONFIG[user.membership] || MEMBERSHIP_CONFIG.REGULAR;
            const statusInfo = STATUS_CONFIG[user.status] || STATUS_CONFIG.ACTIVE;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-white">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.createdAt}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${membershipInfo.className}`}
                  >
                    {membershipInfo.label}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">{user.bookings}</TableCell>
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

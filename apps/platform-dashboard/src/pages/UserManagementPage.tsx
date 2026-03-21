import React, { useState, useMemo } from 'react';
import { MoreVertical } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
} from '@/components/common/filters';

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
  const [filters, setFilters] = useState({
    search: '',
    membership: 'ALL' as string,
    status: 'ALL' as string,
  });

  const filteredUsers = useMemo(() => {
    let result = [...MOCK_USERS];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.membership !== 'ALL') {
      result = result.filter((u) => u.membership === filters.membership);
    }

    if (filters.status !== 'ALL') {
      result = result.filter((u) => u.status === filters.status);
    }

    return result;
  }, [filters]);

  const hasActiveFilters = !!(filters.search || filters.membership !== 'ALL' || filters.status !== 'ALL');

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
      <FilterContainer columns={4}>
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="이름, 이메일로 검색"
        />
        <FilterSelect
          label="멤버십"
          value={filters.membership === 'ALL' ? '' : filters.membership}
          onChange={(value) => setFilters((f) => ({ ...f, membership: value || 'ALL' }))}
          options={[
            { value: 'PREMIUM', label: 'Premium' },
            { value: 'GOLD', label: 'Gold' },
            { value: 'REGULAR', label: 'Regular' },
            { value: 'GUEST', label: 'Guest' },
          ]}
          placeholder="전체 멤버십"
        />
        <FilterSelect
          label="상태"
          value={filters.status === 'ALL' ? '' : filters.status}
          onChange={(value) => setFilters((f) => ({ ...f, status: value || 'ALL' }))}
          options={[
            { value: 'ACTIVE', label: '활성' },
            { value: 'INACTIVE', label: '비활성' },
            { value: 'SUSPENDED', label: '정지' },
          ]}
          placeholder="전체 상태"
        />
        <div className="flex items-end justify-end">
          <FilterResetButton
            hasActiveFilters={hasActiveFilters}
            onClick={() => setFilters({ search: '', membership: 'ALL', status: 'ALL' })}
          />
        </div>
      </FilterContainer>

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
          {filteredUsers.map((user) => {
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

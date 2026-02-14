import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Trash2, AlertTriangle, Edit2 } from 'lucide-react';
import {
  useUsersQuery,
  useDeleteUserMutation,
  useUpdateUserStatusMutation,
  useCompanyMembersQuery,
  useCreateCompanyMemberMutation,
  useUpdateCompanyMemberMutation,
  useDeleteCompanyMemberMutation,
} from '@/hooks/queries';
import { Modal } from '@/components/ui';
import { DataContainer } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import { UserFormModal } from '@/components/features/user/UserFormModal';
import { PageLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/auth.store';
import type { User, UserStatus, UserMembershipTier, CompanyMember, CompanyMemberSource } from '@/types';

type SortField = 'name' | 'email' | 'membershipTier' | 'status' | 'createdAt' | 'lastLoginAt' | 'joinedAt' | 'source';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  membershipTier: UserMembershipTier | 'ALL';
  status: UserStatus | 'ALL';
}

const MEMBERSHIP_LABELS: Record<UserMembershipTier, string> = {
  REGULAR: '일반',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  VIP: 'VIP',
  PREMIUM: '프리미엄',
  GUEST: '게스트',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  SUSPENDED: '정지',
  PENDING: '대기',
};

const SOURCE_LABELS: Record<CompanyMemberSource, string> = {
  MANUAL: '수동 등록',
  BOOKING: '예약 등록',
  WALK_IN: '현장 등록',
};

// 등급별 스타일 정보
const TIER_META: Record<UserMembershipTier, { icon: string; color: string }> = {
  VIP: { icon: '👑', color: 'bg-purple-500/20 text-purple-400 border-purple-200' },
  PLATINUM: { icon: '💎', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  GOLD: { icon: '🥇', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-200' },
  SILVER: { icon: '🥈', color: 'bg-white/10 text-white border-white/15' },
  REGULAR: { icon: '👤', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  PREMIUM: { icon: '⭐', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  GUEST: { icon: '👋', color: 'bg-green-500/20 text-green-400 border-green-200' },
};

// ============================================
// COMPANY 스코프: 가맹점 회원 관리 뷰
// ============================================
const CompanyMemberView: React.FC = () => {
  const [filters, setFilters] = useState({ search: '' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; member?: CompanyMember }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; member?: CompanyMember }>({ open: false });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberMemo, setNewMemberMemo] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: membersResponse, refetch, isLoading } = useCompanyMembersQuery(
    filters.search ? { search: filters.search } : undefined,
  );
  const createMember = useCreateCompanyMemberMutation();
  const updateMember = useUpdateCompanyMemberMutation();
  const deleteMember = useDeleteCompanyMemberMutation();

  // user query for searching users by email
  const { data: usersResponse } = useUsersQuery(
    newMemberEmail.length >= 3 ? { search: newMemberEmail } : undefined,
    1,
    5,
  );
  const searchedUsers = usersResponse?.users || [];

  const members = membersResponse?.members || [];

  const stats = useMemo(() => ({
    total: membersResponse?.total || 0,
    active: members.filter((m) => m.isActive).length,
    inactive: members.filter((m) => !m.isActive).length,
  }), [members, membersResponse]);

  const handleAddMember = async (userId: number) => {
    try {
      await createMember.mutateAsync({
        userId,
        source: 'MANUAL',
        memo: newMemberMemo || undefined,
      });
      setAddModal(false);
      setNewMemberEmail('');
      setNewMemberMemo('');
    } catch {
      // error handled by mutation
    }
  };

  const handleUpdateMember = async () => {
    if (!editModal.member) return;
    try {
      await updateMember.mutateAsync({
        id: editModal.member.id,
        data: { memo: editMemo || undefined, isActive: editIsActive },
      });
      setEditModal({ open: false });
    } catch {
      // error handled by mutation
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteConfirm.member) return;
    try {
      await deleteMember.mutateAsync(deleteConfirm.member.id);
      setDeleteConfirm({ open: false });
    } catch {
      // error handled by mutation
    }
  };

  const openEditModal = (member: CompanyMember) => {
    setEditMemo(member.memo || '');
    setEditIsActive(member.isActive);
    setEditModal({ open: true, member });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.id));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <PageLayout>
      {/* 헤더 카드 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">회원 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              가맹점에 등록된 회원을 관리합니다
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            회원 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                <div className="text-sm text-emerald-400">전체 회원</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">활성 회원</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-sm text-red-600">비활성 회원</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <FilterContainer columns={3}>
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="이름, 이메일, 전화번호..."
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <FilterResetButton
            hasActiveFilters={!!filters.search}
            onClick={() => setFilters({ search: '' })}
            variant="text"
          />
        </div>
      </FilterContainer>

      {/* 활성 필터 태그 */}
      <ActiveFilterTags
        filters={[
          ...(filters.search ? [{ id: 'search', label: '검색', value: filters.search }] : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters((f) => ({ ...f, search: '' }));
        }}
        onResetAll={() => setFilters({ search: '' })}
      />

      {/* 회원 목록 테이블 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">
            회원 목록
            <span className="ml-2 text-sm font-normal text-white/50">
              ({members.length}명)
            </span>
          </h3>
          {selectedIds.length > 0 && (
            <span className="text-sm text-emerald-400">{selectedIds.length}명 선택됨</span>
          )}
        </div>
        <DataContainer
          isLoading={isLoading}
          isEmpty={members.length === 0}
          emptyIcon="🔍"
          emptyMessage={filters.search ? '검색 결과가 없습니다' : '등록된 회원이 없습니다'}
          emptyDescription={filters.search ? '다른 검색어를 시도해 보세요' : '새 회원을 추가해 보세요'}
          emptyAction={
            !filters.search ? (
              <button
                onClick={() => setAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                회원 추가
              </button>
            ) : undefined
          }
          loadingMessage="회원 목록을 불러오는 중..."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/15">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === members.length && members.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    회원 정보
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    등록 경로
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    메모
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    등록일
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(member.id)}
                        onChange={() => handleSelect(member.id)}
                        className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                          {member.user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{member.user.name || '-'}</div>
                          <div className="text-sm text-white/50">{member.user.email}</div>
                          {member.user.phone && (
                            <div className="text-xs text-white/40">{member.user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${
                        member.source === 'BOOKING'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : member.source === 'WALK_IN'
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {SOURCE_LABELS[member.source]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-white/50 max-w-48 truncate">
                      {member.memo || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        member.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-white/50'
                      }`}>
                        {member.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-white/50">
                      {new Date(member.joinedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(member)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, member })}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataContainer>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => { setAddModal(false); setNewMemberEmail(''); setNewMemberMemo(''); }}
        title="회원 추가"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              이메일로 사용자 검색
            </label>
            <input
              type="text"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="이메일을 입력하세요 (3자 이상)"
              className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {newMemberEmail.length >= 3 && searchedUsers.length > 0 && (
            <div className="border border-white/15 rounded-lg overflow-hidden">
              <div className="text-xs font-medium text-white/50 px-3 py-2 bg-white/5">
                검색 결과
              </div>
              {searchedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-white/5 border-t border-white/10"
                >
                  <div>
                    <div className="text-sm text-white">{user.name || '-'}</div>
                    <div className="text-xs text-white/50">{user.email}</div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.id)}
                    disabled={createMember.isPending}
                    className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {createMember.isPending ? '등록 중...' : '등록'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {newMemberEmail.length >= 3 && searchedUsers.length === 0 && (
            <p className="text-sm text-white/40">검색 결과가 없습니다.</p>
          )}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">메모 (선택)</label>
            <input
              type="text"
              value={newMemberMemo}
              onChange={(e) => setNewMemberMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => { setAddModal(false); setNewMemberEmail(''); setNewMemberMemo(''); }}
              className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={editModal.open && !!editModal.member}
        onClose={() => setEditModal({ open: false })}
        title="회원 정보 수정"
        maxWidth="sm"
      >
        {editModal.member && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                {editModal.member.user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-medium text-white">{editModal.member.user.name || '-'}</div>
                <div className="text-sm text-white/50">{editModal.member.user.email}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">메모</label>
              <input
                type="text"
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                />
                <span className="text-sm text-white/70">활성 상태</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditModal({ open: false })}
                className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={updateMember.isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {updateMember.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteConfirm.open && !!deleteConfirm.member}
        onClose={() => setDeleteConfirm({ open: false })}
        title="회원 제거"
        maxWidth="sm"
      >
        {deleteConfirm.member && (
          <>
            <div className="flex items-center space-x-4 p-4 bg-red-500/10 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-white">{deleteConfirm.member.user.name || '-'}</div>
                <div className="text-sm text-white/50">{deleteConfirm.member.user.email}</div>
              </div>
            </div>
            <p className="text-white/60 mb-2">
              이 회원을 가맹점 목록에서 제거하시겠습니까?
            </p>
            <p className="text-sm text-white/40 mb-6">
              사용자 계정은 삭제되지 않으며, 가맹점 회원 연결만 해제됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false })}
                className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={deleteMember.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMember.isPending ? '제거 중...' : '제거'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </PageLayout>
  );
};

// ============================================
// PLATFORM 스코프: 전체 사용자 관리 뷰 (기존)
// ============================================
const PlatformUserView: React.FC = () => {
  const navigate = useNavigate();

  // Queries & Mutations
  const { data: usersResponse, refetch, isLoading } = useUsersQuery();
  const deleteUser = useDeleteUserMutation();
  const updateStatus = useUpdateUserStatusMutation();

  const users = usersResponse?.users || [];

  // Local UI State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    membershipTier: 'ALL',
    status: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State
  const [formModal, setFormModal] = useState<{ open: boolean; user?: User }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user?: User }>({ open: false });

  // Filtered & Sorted Data
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.username?.toLowerCase().includes(search) ||
          u.phone?.includes(search)
      );
    }

    // Membership tier filter
    if (filters.membershipTier !== 'ALL') {
      result = result.filter((u) => u.membershipTier === filters.membershipTier);
    }

    // Status filter
    if (filters.status !== 'ALL') {
      result = result.filter((u) => u.status === filters.status);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField as keyof User];
      let bVal: any = b[sortField as keyof User];

      if (sortField === 'createdAt' || sortField === 'lastLoginAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, filters, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    inactive: users.filter((u) => u.status !== 'ACTIVE').length,
    tierCount: new Set(users.map(u => u.membershipTier)).size,
  }), [users]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.user) return;
    try {
      await deleteUser.mutateAsync(deleteConfirm.user.id);
      setDeleteConfirm({ open: false });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleStatusChange = async (user: User, status: UserStatus) => {
    try {
      await updateStatus.mutateAsync({ id: user.id, status });
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusBadgeStyle = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400';
      case 'INACTIVE': return 'bg-white/10 text-white';
      case 'SUSPENDED': return 'bg-red-500/20 text-red-400';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-white/10 text-white';
    }
  };

  return (
    <PageLayout>
      {/* 헤더 카드 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">회원 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              서비스 이용 회원을 관리하고 등급을 설정합니다
            </p>
          </div>
          <button
            onClick={() => setFormModal({ open: true })}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            회원 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                <div className="text-sm text-emerald-400">전체 회원</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">활성 회원</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-sm text-red-600">비활성 회원</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.tierCount}</div>
                <div className="text-sm text-purple-600">등급 종류</div>
              </div>
              <div className="text-3xl">🏷️</div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <FilterContainer columns={5}>
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="이름, 이메일, 전화번호..."
        />
        <FilterSelect
          label="등급"
          value={filters.membershipTier === 'ALL' ? '' : filters.membershipTier}
          onChange={(value) => setFilters((f) => ({ ...f, membershipTier: (value || 'ALL') as UserMembershipTier | 'ALL' }))}
          options={[
            { value: 'VIP', label: 'VIP' },
            { value: 'PLATINUM', label: '플래티넘' },
            { value: 'GOLD', label: '골드' },
            { value: 'SILVER', label: '실버' },
            { value: 'REGULAR', label: '일반' },
          ]}
          placeholder="전체 등급"
        />
        <FilterSelect
          label="상태"
          value={filters.status === 'ALL' ? '' : filters.status}
          onChange={(value) => setFilters((f) => ({ ...f, status: (value || 'ALL') as UserStatus | 'ALL' }))}
          options={[
            { value: 'ACTIVE', label: '활성' },
            { value: 'INACTIVE', label: '비활성' },
            { value: 'SUSPENDED', label: '정지' },
            { value: 'PENDING', label: '대기' },
          ]}
          placeholder="전체 상태"
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <FilterResetButton
            hasActiveFilters={!!(filters.search || filters.membershipTier !== 'ALL' || filters.status !== 'ALL')}
            onClick={() => setFilters({ search: '', membershipTier: 'ALL', status: 'ALL' })}
            variant="text"
          />
        </div>
      </FilterContainer>

      {/* 활성 필터 태그 */}
      <ActiveFilterTags
        filters={[
          ...(filters.search ? [{ id: 'search', label: '검색', value: filters.search }] : []),
          ...(filters.membershipTier !== 'ALL' ? [{ id: 'tier', label: '등급', value: MEMBERSHIP_LABELS[filters.membershipTier], color: 'purple' as const }] : []),
          ...(filters.status !== 'ALL' ? [{ id: 'status', label: '상태', value: STATUS_LABELS[filters.status], color: 'green' as const }] : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters(f => ({ ...f, search: '' }));
          if (id === 'tier') setFilters(f => ({ ...f, membershipTier: 'ALL' }));
          if (id === 'status') setFilters(f => ({ ...f, status: 'ALL' }));
        }}
        onResetAll={() => setFilters({ search: '', membershipTier: 'ALL', status: 'ALL' })}
      />

      {/* 회원 목록 테이블 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">
            회원 목록
            <span className="ml-2 text-sm font-normal text-white/50">
              ({filteredUsers.length}명)
            </span>
          </h3>
          {selectedIds.length > 0 && (
            <span className="text-sm text-emerald-400">{selectedIds.length}명 선택됨</span>
          )}
        </div>
        <DataContainer
          isLoading={isLoading}
          isEmpty={filteredUsers.length === 0}
          emptyIcon="🔍"
          emptyMessage={users.length === 0 ? '등록된 회원이 없습니다' : '검색 결과가 없습니다'}
          emptyDescription={users.length === 0 ? '새 회원을 추가해 보세요' : '다른 검색어나 필터를 시도해 보세요'}
          emptyAction={
            users.length === 0 ? (
              <button
                onClick={() => setFormModal({ open: true })}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                회원 추가
              </button>
            ) : undefined
          }
          loadingMessage="회원 목록을 불러오는 중..."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/15">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>회원 정보</span>
                      {sortField === 'name' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('membershipTier')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>등급</span>
                      {sortField === 'membershipTier' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>상태</span>
                      {sortField === 'status' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('lastLoginAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>마지막 로그인</span>
                      {sortField === 'lastLoginAt' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => navigate(`/user-management/${user.id}`)}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => handleSelect(user.id)}
                        className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-sm text-white/50">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-white/40">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{user.membershipTier ? TIER_META[user.membershipTier]?.icon : '👤'}</span>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${user.membershipTier ? TIER_META[user.membershipTier]?.color : 'bg-white/10 text-white'}`}>
                          {user.membershipTier ? (MEMBERSHIP_LABELS[user.membershipTier] || user.membershipTier) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={user.status || 'ACTIVE'}
                        onChange={(e) => handleStatusChange(user, e.target.value as UserStatus)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border-0 cursor-pointer transition-colors ${getStatusBadgeStyle(user.status || 'ACTIVE')}`}
                      >
                        <option value="ACTIVE">활성</option>
                        <option value="INACTIVE">비활성</option>
                        <option value="SUSPENDED">정지</option>
                        <option value="PENDING">대기</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-white/50">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : <span className="text-white/40">-</span>}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, user })}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataContainer>
      </div>

      {/* Form Modal */}
      <UserFormModal
        open={formModal.open}
        user={formModal.user}
        onClose={() => setFormModal({ open: false })}
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteConfirm.open && !!deleteConfirm.user}
        onClose={() => setDeleteConfirm({ open: false })}
        title="회원 삭제"
        maxWidth="sm"
      >
        {deleteConfirm.user && (
          <>
            <div className="flex items-center space-x-4 p-4 bg-red-500/10 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-white">{deleteConfirm.user.name}</div>
                <div className="text-sm text-white/50">{deleteConfirm.user.email}</div>
              </div>
            </div>
            <p className="text-white/60 mb-2">
              이 회원을 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-600 mb-6">
              이 작업은 되돌릴 수 없습니다. 회원의 모든 데이터가 영구적으로 삭제됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false })}
                className="px-4 py-2 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteUser.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteUser.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </PageLayout>
  );
};

// ============================================
// Main Component: 스코프에 따라 분기
// ============================================
export const UserManagementPage: React.FC = () => {
  const primaryScope = useAuthStore((s) => s.currentAdmin?.primaryScope);

  if (primaryScope === 'COMPANY') {
    return <CompanyMemberView />;
  }

  return <PlatformUserView />;
};

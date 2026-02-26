import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Edit2 } from 'lucide-react';
import {
  useUsersQuery,
  useCompanyMembersQuery,
  useCreateCompanyMemberMutation,
  useUpdateCompanyMemberMutation,
} from '@/hooks/queries';
import { Modal } from '@/components/ui';
import { DataContainer } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import { PageLayout } from '@/components/layout';
import type { CompanyMember, CompanyMemberSource } from '@/types';

const SOURCE_LABELS: Record<CompanyMemberSource, string> = {
  MANUAL: '수동 등록',
  BOOKING: '예약 등록',
  WALK_IN: '현장 등록',
};

// ============================================
// COMPANY 스코프: 가맹점 회원 관리 뷰
// ============================================
const CompanyMemberView: React.FC = () => {
  const [filters, setFilters] = useState({ search: '' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; member?: CompanyMember }>({ open: false });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberMemo, setNewMemberMemo] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: membersResponse, refetch, isLoading } = useCompanyMembersQuery(
    filters.search ? { search: filters.search } : undefined,
  );
  const createMember = useCreateCompanyMemberMutation();
  const updateMember = useUpdateCompanyMemberMutation();

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
      <FilterContainer columns="flex">
        <div className="flex items-end justify-between w-full">
          <div className="flex items-end gap-4">
            <FilterSearch
              label="검색"
              showLabel
              value={filters.search}
              onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
              placeholder="이름, 이메일, 전화번호..."
            />
          </div>
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
                      <button
                        onClick={() => openEditModal(member)}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        수정
                      </button>
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

    </PageLayout>
  );
};

// ============================================
// Main Component: admin-dashboard는 가맹점 회원 관리 뷰 통일
// ============================================
export const UserManagementPage: React.FC = () => {
  return <CompanyMemberView />;
};

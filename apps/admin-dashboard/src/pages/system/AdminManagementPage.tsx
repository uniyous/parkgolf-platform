import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { useAdminsQuery, useDeleteAdminMutation, useToggleAdminStatusMutation } from '@/hooks/queries';
import { useCurrentAdmin } from '@/stores';
import { Modal } from '@/components/ui';
import { DataContainer } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import { AdminFormModal, RoleManagementModal } from '@/components/features/admin';
import { PageLayout } from '@/components/layout';
import type { Admin, AdminRole, AdminScope } from '@/types';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS, canManageAdmin, PLATFORM_ROLES, COMPANY_ROLES } from '@/utils';

type SortField = 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  role: AdminRole | 'ALL';
  scope: AdminScope | 'ALL';
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

// 역할별 스타일 정보
const ROLE_META: Record<string, { icon: string; color: string }> = {
  // 플랫폼 역할
  PLATFORM_ADMIN: { icon: '👑', color: 'bg-purple-500/20 text-purple-400 border-purple-200' },
  PLATFORM_SUPPORT: { icon: '🎧', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-200' },
  PLATFORM_VIEWER: { icon: '👁️', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  // 회사 역할
  COMPANY_ADMIN: { icon: '🏢', color: 'bg-green-500/20 text-green-400 border-green-200' },
  COMPANY_MANAGER: { icon: '👨‍💼', color: 'bg-teal-500/20 text-teal-400 border-teal-200' },
  COMPANY_STAFF: { icon: '👤', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-200' },
  COMPANY_VIEWER: { icon: '📖', color: 'bg-white/10 text-white border-white/15' },
};

export const AdminManagementPage: React.FC = () => {
  // Queries & Mutations
  const { data: admins = [], isLoading } = useAdminsQuery();
  const deleteAdmin = useDeleteAdminMutation();
  const toggleStatus = useToggleAdminStatusMutation();
  const currentAdmin = useCurrentAdmin();

  // Local UI State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: 'ALL',
    scope: 'ALL',
    status: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State
  const [formModal, setFormModal] = useState<{ open: boolean; admin?: Admin }>({ open: false });
  const [roleModal, setRoleModal] = useState<{ open: boolean; admin?: Admin }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; admin?: Admin }>({ open: false });

  // Helper: 관리자의 주 역할 가져오기
  const getAdminRole = (admin: Admin): AdminRole | undefined => {
    return admin.primaryRole || admin.companies?.[0]?.companyRoleCode || admin.role;
  };

  // Filtered & Sorted Data
  const filteredAdmins = useMemo(() => {
    let result = [...admins];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(search) ||
          a.email?.toLowerCase().includes(search) ||
          a.username?.toLowerCase().includes(search) ||
          a.primaryCompany?.company?.name?.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (filters.role !== 'ALL') {
      result = result.filter((a) => getAdminRole(a) === filters.role);
    }

    // Scope filter
    if (filters.scope !== 'ALL') {
      result = result.filter((a) => a.primaryScope === filters.scope);
    }

    // Status filter
    if (filters.status !== 'ALL') {
      result = result.filter((a) => (filters.status === 'ACTIVE' ? a.isActive : !a.isActive));
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'role') {
        aVal = getAdminRole(a);
        bVal = getAdminRole(b);
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (sortField === 'createdAt' || sortField === 'lastLoginAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [admins, filters, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: admins.length,
    active: admins.filter((a) => a.isActive).length,
    inactive: admins.filter((a) => !a.isActive).length,
    roleCount: new Set(admins.map(a => getAdminRole(a)).filter(Boolean)).size,
  }), [admins]);

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
    if (!deleteConfirm.admin) return;
    await deleteAdmin.mutateAsync(deleteConfirm.admin.id);
    setDeleteConfirm({ open: false });
  };

  const handleToggleStatus = async (admin: Admin) => {
    await toggleStatus.mutateAsync(admin.id);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAdmins.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAdmins.map((a) => a.id));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getRoleBadgeStyle = (role: AdminRole | undefined) => {
    if (!role) return 'bg-white/10 text-white';
    return ADMIN_ROLE_COLORS[role] || 'bg-white/10 text-white';
  };

  const canManage = (admin: Admin) => {
    if (!currentAdmin || !currentAdmin.primaryRole) return false;
    const targetRole = getAdminRole(admin);
    if (!targetRole) return false;
    return canManageAdmin(currentAdmin.primaryRole, targetRole);
  };

  return (
    <PageLayout>
      {/* 헤더 카드 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">관리자 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              시스템 관리자 계정을 관리하고 권한을 설정합니다
            </p>
          </div>
          <button
            onClick={() => setFormModal({ open: true })}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            관리자 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                <div className="text-sm text-emerald-400">전체 관리자</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">활성 관리자</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-sm text-red-600">비활성 관리자</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.roleCount}</div>
                <div className="text-sm text-purple-600">역할 종류</div>
              </div>
              <div className="text-3xl">🏷️</div>
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
              placeholder="이름, 이메일, 아이디..."
            />
            <FilterSelect
              label="역할"
              value={filters.role === 'ALL' ? '' : filters.role}
              onChange={(value) => setFilters((f) => ({ ...f, role: (value || 'ALL') as AdminRole | 'ALL' }))}
              groups={[
                { label: '플랫폼 역할', options: PLATFORM_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_LABELS[role] })) },
                { label: '회사 역할', options: COMPANY_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_LABELS[role] })) },
              ]}
              placeholder="전체 역할"
            />
            <FilterSelect
              label="상태"
              value={filters.status === 'ALL' ? '' : filters.status}
              onChange={(value) => setFilters((f) => ({ ...f, status: (value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE' }))}
              options={[
                { value: 'ACTIVE', label: '활성' },
                { value: 'INACTIVE', label: '비활성' },
              ]}
              placeholder="전체 상태"
            />
          </div>
          <div className="flex items-end gap-2">
            <FilterResetButton
              hasActiveFilters={!!(filters.search || filters.role !== 'ALL' || filters.status !== 'ALL')}
              onClick={() => setFilters({ search: '', role: 'ALL', scope: 'ALL', status: 'ALL' })}
              variant="text"
            />
          </div>
        </div>
      </FilterContainer>

      {/* 활성 필터 태그 */}
      <ActiveFilterTags
        filters={[
          ...(filters.search ? [{ id: 'search', label: '검색', value: filters.search }] : []),
          ...(filters.role !== 'ALL' ? [{ id: 'role', label: '역할', value: ADMIN_ROLE_LABELS[filters.role], color: 'violet' as const }] : []),
          ...(filters.status !== 'ALL' ? [{ id: 'status', label: '상태', value: filters.status === 'ACTIVE' ? '활성' : '비활성', color: 'green' as const }] : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters(f => ({ ...f, search: '' }));
          if (id === 'role') setFilters(f => ({ ...f, role: 'ALL' }));
          if (id === 'status') setFilters(f => ({ ...f, status: 'ALL' }));
        }}
        onResetAll={() => setFilters({ search: '', role: 'ALL', scope: 'ALL', status: 'ALL' })}
      />

      {/* 관리자 목록 테이블 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">
            관리자 목록
            <span className="ml-2 text-sm font-normal text-white/50">
              ({filteredAdmins.length}명)
            </span>
          </h3>
          {selectedIds.length > 0 && (
            <span className="text-sm text-emerald-400">{selectedIds.length}명 선택됨</span>
          )}
        </div>
        <DataContainer
          isLoading={isLoading}
          isEmpty={filteredAdmins.length === 0}
          emptyIcon="🔍"
          emptyMessage={admins.length === 0 ? '등록된 관리자가 없습니다' : '검색 결과가 없습니다'}
          emptyDescription={admins.length === 0 ? '새 관리자를 추가해 보세요' : '다른 검색어나 필터를 시도해 보세요'}
          emptyAction={
            admins.length === 0 ? (
              <button
                onClick={() => setFormModal({ open: true })}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                관리자 추가
              </button>
            ) : undefined
          }
          loadingMessage="관리자 목록을 불러오는 중..."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/15">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredAdmins.length && filteredAdmins.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>관리자 정보</span>
                      {sortField === 'name' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>역할</span>
                      {sortField === 'role' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    상태
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
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(admin.id)}
                        onChange={() => handleSelect(admin.id)}
                        className="rounded border-white/15 text-emerald-400 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                          {admin.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{admin.name}</div>
                          <div className="text-sm text-white/50">{admin.email}</div>
                          <div className="text-xs text-white/40">@{admin.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const role = getAdminRole(admin);
                        const companyName = admin.primaryCompany?.company?.name;
                        return (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{role ? ROLE_META[role]?.icon || '👤' : '👤'}</span>
                              <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${role ? ROLE_META[role]?.color || getRoleBadgeStyle(role) : 'bg-white/10 text-white'}`}>
                                {role ? ADMIN_ROLE_LABELS[role] || role : '역할 없음'}
                              </span>
                            </div>
                            {companyName && (
                              <span className="text-xs text-white/50 pl-7">@ {companyName}</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleStatus(admin)}
                        disabled={!canManage(admin)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          admin.isActive
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-200'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-200'
                        } ${canManage(admin) ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      >
                        <span className={`w-2 h-2 rounded-full mr-2 ${admin.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {admin.isActive ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-white/50">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : <span className="text-white/40">-</span>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setFormModal({ open: true, admin })}
                          disabled={!canManage(admin)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          수정
                        </button>
                        <button
                          onClick={() => setRoleModal({ open: true, admin })}
                          disabled={!canManage(admin)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          권한
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, admin })}
                          disabled={!canManage(admin)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Form Modal */}
      <AdminFormModal
        open={formModal.open}
        admin={formModal.admin}
        onClose={() => setFormModal({ open: false })}
      />

      {/* Role Management Modal */}
      <RoleManagementModal
        open={roleModal.open}
        admin={roleModal.admin}
        onClose={() => setRoleModal({ open: false })}
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteConfirm.open && !!deleteConfirm.admin}
        onClose={() => setDeleteConfirm({ open: false })}
        title="관리자 삭제"
        maxWidth="sm"
      >
        {deleteConfirm.admin && (
          <>
            <div className="flex items-center space-x-4 p-4 bg-red-500/10 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-white">{deleteConfirm.admin.name}</div>
                <div className="text-sm text-white/50">{deleteConfirm.admin.email}</div>
              </div>
            </div>
            <p className="text-white/60 mb-2">
              이 관리자를 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-600 mb-6">
              이 작업은 되돌릴 수 없습니다. 관리자의 모든 데이터가 영구적으로 삭제됩니다.
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
                disabled={deleteAdmin.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteAdmin.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </PageLayout>
  );
};

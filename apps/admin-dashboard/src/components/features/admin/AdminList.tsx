import React, { useState, useMemo } from 'react';
import { useAdminsQuery, useDeleteAdminMutation, useToggleAdminStatusMutation } from '@/hooks/queries';
import { useCurrentAdmin } from '@/stores';
import { Modal } from '@/components/ui';
import { DataContainer } from '@/components/common';
import { AdminFormModal } from './AdminFormModal';
import { RoleManagementModal } from './RoleManagementModal';
import type { Admin, AdminRole, AdminScope } from '@/types';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS, canManageAdmin } from '@/utils';

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
  SUPER_ADMIN: { icon: '👑', color: 'bg-red-100 text-red-800 border-red-200' },
  ADMIN: { icon: '🛡️', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  MANAGER: { icon: '👨‍💼', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  OPERATOR: { icon: '🎧', color: 'bg-green-100 text-green-800 border-green-200' },
};

export const AdminList: React.FC = () => {
  // Queries & Mutations
  const { data: admins = [], refetch, isLoading } = useAdminsQuery();
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
          a.username?.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (filters.role !== 'ALL') {
      result = result.filter((a) => a.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'ALL') {
      result = result.filter((a) => (filters.status === 'ACTIVE' ? a.isActive : !a.isActive));
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

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
    roleCount: new Set(admins.map(a => a.role)).size,
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
    try {
      await deleteAdmin.mutateAsync(deleteConfirm.admin.id);
      setDeleteConfirm({ open: false });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    try {
      await toggleStatus.mutateAsync(admin.id);
    } catch (error) {
      console.error('Toggle status failed:', error);
    }
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

  const getRoleBadgeStyle = (role: AdminRole) => {
    return ADMIN_ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
  };

  const canManage = (admin: Admin) => {
    if (!currentAdmin) return false;
    return canManageAdmin(currentAdmin.role, admin.role);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 카드 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">관리자 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              시스템 관리자 계정을 관리하고 권한을 설정합니다
            </p>
          </div>
          <button
            onClick={() => setFormModal({ open: true })}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            관리자 추가
          </button>
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-600">전체 관리자</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">활성 관리자</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-sm text-red-600">비활성 관리자</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
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

      {/* 필터 & 검색 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="이름, 이메일, 아이디 검색..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as AdminRole | 'ALL' }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">전체 역할</option>
              <option value="SUPER_ADMIN">슈퍼 관리자</option>
              <option value="ADMIN">관리자</option>
              <option value="MANAGER">매니저</option>
              <option value="OPERATOR">운영자</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE' }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로고침
            </button>
          </div>
        </div>
        {(filters.search || filters.role !== 'ALL' || filters.status !== 'ALL') && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">필터:</span>
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 rounded-full">
                검색: {filters.search}
                <button onClick={() => setFilters(f => ({ ...f, search: '' }))} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
              </span>
            )}
            {filters.role !== 'ALL' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                역할: {ADMIN_ROLE_LABELS[filters.role]}
                <button onClick={() => setFilters(f => ({ ...f, role: 'ALL' }))} className="ml-1 text-blue-400 hover:text-blue-600">×</button>
              </span>
            )}
            {filters.status !== 'ALL' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                상태: {filters.status === 'ACTIVE' ? '활성' : '비활성'}
                <button onClick={() => setFilters(f => ({ ...f, status: 'ALL' }))} className="ml-1 text-green-400 hover:text-green-600">×</button>
              </span>
            )}
            <button
              onClick={() => setFilters({ search: '', role: 'ALL', scope: 'ALL', status: 'ALL' })}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              모두 초기화
            </button>
          </div>
        )}
      </div>

      {/* 관리자 목록 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            관리자 목록
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredAdmins.length}명)
            </span>
          </h3>
          {selectedIds.length > 0 && (
            <span className="text-sm text-blue-600">{selectedIds.length}명 선택됨</span>
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                관리자 추가
              </button>
            ) : undefined
          }
          loadingMessage="관리자 목록을 불러오는 중..."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredAdmins.length && filteredAdmins.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>관리자 정보</span>
                      {sortField === 'name' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>역할</span>
                      {sortField === 'role' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('lastLoginAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>마지막 로그인</span>
                      {sortField === 'lastLoginAt' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(admin.id)}
                        onChange={() => handleSelect(admin.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                          {admin.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{admin.name}</div>
                          <div className="text-sm text-gray-500">{admin.email}</div>
                          <div className="text-xs text-gray-400">@{admin.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{ROLE_META[admin.role]?.icon || '👤'}</span>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${ROLE_META[admin.role]?.color || getRoleBadgeStyle(admin.role)}`}>
                          {ADMIN_ROLE_LABELS[admin.role] || admin.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleStatus(admin)}
                        disabled={!canManage(admin)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          admin.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } ${canManage(admin) ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      >
                        <span className={`w-2 h-2 rounded-full mr-2 ${admin.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {admin.isActive ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setFormModal({ open: true, admin })}
                          disabled={!canManage(admin)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          수정
                        </button>
                        <button
                          onClick={() => setRoleModal({ open: true, admin })}
                          disabled={!canManage(admin)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          권한
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, admin })}
                          disabled={!canManage(admin)}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
            <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">{deleteConfirm.admin.name}</div>
                <div className="text-sm text-gray-500">{deleteConfirm.admin.email}</div>
              </div>
            </div>
            <p className="text-gray-600 mb-2">
              이 관리자를 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-600 mb-6">
              이 작업은 되돌릴 수 없습니다. 관리자의 모든 데이터가 영구적으로 삭제됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
    </div>
  );
};
